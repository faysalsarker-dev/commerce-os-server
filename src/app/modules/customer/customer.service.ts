import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  getAll,
  updateOne,
} from "../../services/base.service";
import { $Enums, Customer } from "../../generated/prisma/client";
import {
  CustomerCreateInput,
  CustomerUpdateInput,
} from "../../generated/prisma/models";

export const createCustomer = async (
  payload: CustomerCreateInput,
): Promise<Customer> => {
  if (!payload.name) {
    throw new AppError("Customer name is required", 400);
  }

  if (payload.phone) {
    const existing = await prisma.customer.findUnique({
      where: { phone: payload.phone },
    });
    if (existing) {
      throw new AppError("Customer with this phone number already exists", 409);
    }
  }

  const customer = await createOne<Customer>(prisma.customer, {
    name: payload.name,
    phone: payload.phone || null,
  } as Partial<Customer>);

  return customer;
};

export const getCustomers = async (query: Record<string, any>) => {
  const result = await getAll<Customer>(prisma.customer, query, ["name", "phone"]);

  return {
    data: result.data,
    meta: result.meta,
  };
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: {
          items: true,
          payments: true,
          soldBy: {
            select: { id: true, name: true, email: true },
          },
          refunds: {
            include: {
              items: { include: { saleItem: true } },
              payments: true,
              processedBy: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const totalRefunded = customer.sales.reduce(
    (total, sale) =>
      total +
      sale.refunds.reduce(
        (saleTotal, refund) => saleTotal + Number(refund.amount),
        0,
      ),
    0,
  );
  const totalSpent = customer.sales.reduce(
    (total, sale) => total + Number(sale.total),
    0,
  );
  const totalDue = customer.sales.reduce(
    (total, sale) => total + Number(sale.dueAmount),
    0,
  );

  return {
    ...customer,
    totalOrders: customer.sales.length,
    totalSpent,
    totalDue,
    totalRefunded,
    netSpent: totalSpent - totalRefunded,
    lastPurchaseAt: customer.sales[0]?.createdAt ?? null,
  };
};

type CustomerLookup = {
  id: string;
  name: string;
  phone: string | null;
  totalDue: number;
  totalOrders: number;
  totalSpent: number;
};

export const getCustomerByPhone = async (
  phone: string,
): Promise<CustomerLookup | null> => {
  const customer = await prisma.customer.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      totalDue: true,
      totalOrders: true,
      totalSpent: true,
    },
  });

  if (!customer) return null;

  return {
    ...customer,
    totalDue: customer.totalDue.toNumber(),
    totalSpent: customer.totalSpent.toNumber(),
  };
};

export const updateCustomerById = async (
  id: string,
  payload: CustomerUpdateInput,
): Promise<Customer> => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Customer not found", 404);
  }

  if (payload.phone && payload.phone !== existing.phone) {
    const phoneOwner = await prisma.customer.findUnique({
      where: { phone: payload.phone as string },
    });
    if (phoneOwner) {
      throw new AppError("Phone number is already in use by another customer", 409);
    }
  }

  const updatedCustomer = await updateOne<Customer>(prisma.customer, id, {
    ...(payload.name && { name: payload.name }),
    ...(payload.phone !== undefined && { phone: payload.phone }),
  } as Partial<Customer>);

  return updatedCustomer;
};

export type CustomerPaymentPayload = {
  saleId: string;
  amount: number;
  method: $Enums.PaymentMethod;
  reference?: string;
  notes?: string;
};

export const recordCustomerPayment = async (
  customerId: string,
  payload: CustomerPaymentPayload,
  receivedById: string,
) => {
  const amount = Math.round(payload.amount * 100) / 100;
  if (amount <= 0) {
    throw new AppError("Payment amount must be greater than 0.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    const sale = await tx.sale.findFirst({
      where: { id: payload.saleId, customerId },
      select: { id: true },
    });
    if (!sale) {
      throw new AppError("Sale not found for this customer.", 404);
    }

    const updateResult = await tx.sale.updateMany({
      where: {
        id: sale.id,
        customerId,
        dueAmount: { gte: amount },
        status: {
          notIn: [$Enums.SaleStatus.CANCELLED, $Enums.SaleStatus.RETURNED],
        },
      },
      data: {
        paidAmount: { increment: amount },
        dueAmount: { decrement: amount },
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        "Payment exceeds the outstanding balance or this sale cannot accept payments.",
        400,
      );
    }

    const updatedSale = await tx.sale.findUnique({
      where: { id: sale.id },
    });
    if (!updatedSale) {
      throw new AppError("Sale not found", 404);
    }

    const payment = await tx.payment.create({
      data: {
        saleId: sale.id,
        method: payload.method,
        amount,
        reference: payload.reference?.trim() || null,
        notes: payload.notes?.trim() || null,
        receivedById,
      },
    });

    const updatedSaleWithStatus = await tx.sale.update({
      where: { id: sale.id },
      data: {
        paymentStatus:
          updatedSale.status === $Enums.SaleStatus.PARTIALLY_RETURNED
            ? $Enums.PaymentStatus.PARTIALLY_REFUNDED
            : Number(updatedSale.dueAmount) === 0
              ? $Enums.PaymentStatus.PAID
              : $Enums.PaymentStatus.PARTIAL,
      },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: { totalDue: { decrement: amount } },
      select: { id: true, totalDue: true },
    });

    return {
      payment,
      sale: updatedSaleWithStatus,
      customer: {
        ...updatedCustomer,
        totalDue: Number(updatedCustomer.totalDue),
      },
    };
  });
};

export const deleteCustomerById = async (id: string): Promise<Customer> => {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    const salesCount = await tx.sale.count({ where: { customerId: id } });
    if (salesCount > 0) {
      throw new AppError(
        "Cannot delete a customer with sales history. Keep the customer record to preserve purchase and refund history.",
        409,
      );
    }

    return tx.customer.delete({ where: { id } });
  });
};
