import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderSchema,
} from "./order.validation";
import { z } from "zod";

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
} satisfies Prisma.OrderInclude;

export const createOrder = async (payload: CreateOrderInput) => {
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

      return tx.order.create({
        data: {
          customerId: customer.id,
          saleId: sale.id,
        },
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
) => {
  const exists = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    throw new AppError("Order not found", 404);
  }

  return prisma.order.update({
    where: { id },
    data: { status: payload.status },
    include: orderDetailInclude,
  });
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
