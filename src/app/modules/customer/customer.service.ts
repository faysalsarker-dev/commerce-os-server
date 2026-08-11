import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import { Customer } from "../../generated/prisma/client";
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

export const getCustomerById = async (id: string): Promise<Customer> => {
  const customer = await getById<Customer>(prisma.customer, id, {
    sales: {
      include: {
        items: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    },
  });
  return customer;
};

// export const getCustomerByPhone = async (
//   phone: string,
// ): Promise<Customer | null> => {
//   const customer = await prisma.customer.findUnique({
//     where: { phone },
//     include: {
//       sales: {
//         include: {
//           items: true,
//           payments: true,
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//       },
//     },
//   });
//   return customer;
// };




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

export const deleteCustomerById = async (id: string): Promise<Customer> => {
  const customer = await deleteOne<Customer>(prisma.customer, id);
  return customer;
};
