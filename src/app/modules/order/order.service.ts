import { Prisma } from "../../generated/prisma/client";
import { OrderStatus } from "../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderSchema,
} from "./order.validation";
import { z } from "zod";
import { broadcastStockUpdate, type StockUpdatePayload } from "../../config/socket";

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

const orderListInclude = {
  customer: {
    select: { id: true, name: true, phone: true },
  },
  sale: {
    select: {
      id: true,
      invoiceNo: true,
      channel: true,
      status: true,
      total: true,
      paymentStatus: true,
      campaign: {
        select: { id: true, name: true, platform: true },
      },
    },
  },
  _count: {
    select: { shipments: true },
  },
} satisfies Prisma.OrderInclude;

const orderDetailInclude = {
  customer: {
    select: { id: true, name: true, phone: true },
  },
  sale: {
    include: {
      campaign: {
        select: { id: true, name: true, platform: true },
      },
      items: {
        include: {
          variant: {
            include: {
              size: true,
              productColor: { include: { product: true } },
            },
          },
        },
      },
      payments: true,
      refunds: {
        include: {
          items: true,
          payments: true,
        },
      },
      exchanges: {
        include: { items: true, processedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  },
  shipments: {
    include: {
      courierAccount: {
        select: { id: true, label: true, provider: true },
      },
      events: { orderBy: { occurredAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  },
  statusHistory: {
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.OrderInclude;

export const createOrder = async (payload: CreateOrderInput, changedById?: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: payload.customerId },
        select: { id: true },
      });

      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      const sale = await tx.sale.findUnique({
        where: { id: payload.saleId },
        select: { id: true, customerId: true, order: { select: { id: true } } },
      });

      if (!sale) {
        throw new AppError("Sale not found", 404);
      }

      if (sale.order) {
        throw new AppError("Sale is already linked to an order", 409);
      }

      if (sale.customerId && sale.customerId !== customer.id) {
        throw new AppError("Sale belongs to a different customer", 400);
      }

      if (!sale.customerId) {
        await tx.sale.update({
          where: { id: sale.id },
          data: { customerId: customer.id },
        });
      }

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          saleId: sale.id,
        },
        include: orderDetailInclude,
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: order.status, changedById },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderDetailInclude,
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Sale is already linked to an order", 409);
    }

    throw error;
  }
};

export const getOrders = async (query: Record<string, unknown>) => {
  const filters = listOrdersQuerySchema.parse(query);
  const conditions: Prisma.OrderWhereInput[] = [];

  if (filters.status) conditions.push({ status: filters.status });
  if (filters.customerId) conditions.push({ customerId: filters.customerId });
  if (filters.saleId) conditions.push({ saleId: filters.saleId });
  if (filters.channel) conditions.push({ sale: { channel: filters.channel } });
  if (filters.campaignId) conditions.push({ sale: { campaignId: filters.campaignId } });
  if (filters.searchTerm) {
    conditions.push({
      OR: [
        { customer: { name: { contains: filters.searchTerm, mode: "insensitive" } } },
        { customer: { phone: { contains: filters.searchTerm, mode: "insensitive" } } },
        { sale: { invoiceNo: { contains: filters.searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.OrderWhereInput = conditions.length
    ? { AND: conditions }
    : {};
  const skip = (filters.page - 1) * filters.limit;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderListInclude,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.limit,
    }),
    prisma.order.count({ where }),
  ]);
  const totalPages = Math.ceil(total / filters.limit);

  return {
    data,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPrevPage: filters.page > 1,
    },
  };
};

export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const updateOrderById = async (
  id: string,
  payload: UpdateOrderInput,
  changedById?: string,
) => {
  const stockUpdates: StockUpdatePayload[] = [];
  const order = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`,
    );
    const current = await tx.order.findUnique({
      where: { id },
      include: { sale: { include: { items: true } }, customer: true },
    });
    if (!current) throw new AppError("Order not found", 404);
    if (current.status === payload.status) return tx.order.findUniqueOrThrow({
      where: { id }, include: orderDetailInclude,
    });

    const allowed: Record<string, string[]> = {
      DRAFT: ["PENDING", "CANCELLED"],
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["PACKED", "CANCELLED"],
      PACKED: ["SHIPPED"],
      SHIPPED: ["COMPLETED"],
      COMPLETED: [],
      CANCELLED: [],
      RETURNED: [],
    };
    if (!allowed[current.status].includes(payload.status)) {
      throw new AppError(
        `Order cannot transition from ${current.status} to ${payload.status}.`,
        409,
      );
    }

    if (payload.status === OrderStatus.CANCELLED) {
      if (Number(current.sale.paidAmount) > 0) {
        throw new AppError("Refund collected payments before cancelling this order.", 409);
      }
      const variantIds = [...new Set(current.sale.items.map((item) => item.variantId))];
      for (const variantId of variantIds) {
        const quantity = current.sale.items
          .filter((item) => item.variantId === variantId)
          .reduce((sum, item) => sum + item.quantity, 0);
        const variant = await tx.productVariant.update({
          where: { id: variantId },
          data: { stockQty: { increment: quantity } },
          include: { size: true, productColor: { include: { product: true } } },
        });
        stockUpdates.push({
          variantId,
          productId: variant.productColor.product.id,
          productName: variant.productColor.product.name,
          colorName: variant.productColor.colorName,
          size: variant.size.size,
          stockQty: variant.stockQty,
          movementType: "RETURN_IN",
          updatedAt: new Date(),
        });
        await tx.stockMovement.create({
          data: { variantId, type: "ADJUSTMENT", quantity, reason: `Stock restored for cancelled order ${id}` },
        });
      }
      await tx.sale.update({
        where: { id: current.saleId },
        data: { status: "CANCELLED", dueAmount: 0 },
      });
      if (current.sale.customerId) {
        await tx.customer.update({
          where: { id: current.sale.customerId },
          data: {
            totalOrders: { decrement: 1 },
            totalSpent: { decrement: current.sale.total },
            totalDue: { decrement: current.sale.dueAmount },
          },
        });
      }
    }

    await tx.order.update({
      where: { id },
      data: { status: payload.status },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: id, status: payload.status, changedById },
    });
    if (payload.status === OrderStatus.CONFIRMED || payload.status === OrderStatus.COMPLETED) {
      await tx.sale.update({
        where: { id: current.saleId },
        data: { status: payload.status === OrderStatus.COMPLETED ? "COMPLETED" : "CONFIRMED" },
      });
    }
    return tx.order.findUniqueOrThrow({
      where: { id },
      include: orderDetailInclude,
    });
  });
  stockUpdates.forEach(broadcastStockUpdate);
  return order;
};

export const deleteOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { shipments: true } },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order._count.shipments > 0) {
    throw new AppError(
      "Cannot delete an order with shipment history; cancel the order instead",
      409,
    );
  }

  return prisma.order.delete({
    where: { id },
    include: orderListInclude,
  });
};
