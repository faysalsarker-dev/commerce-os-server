import bcrypt from "bcryptjs";
import { config } from "../../config";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import { Role } from "../../generated/prisma/enums";
import {
  UserCreateInput,
  UserUpdateInput,
} from "../../generated/prisma/models";
import { EmployeeDetailCreateWithoutUserInput } from "../../generated/prisma/models/EmployeeDetail";
import { safeUser } from "../../utils/auth/authUtils";
import { User } from "../../generated/prisma/client";
import { sendEmail } from "../../lib/nodemailer";
import { clearUserCache } from "../auth/auth.service";
import { deleteEntityImages, handleImageUpdate } from "../../utils/helper/imageUtils";
import { generateEmployeeWelcomeEmail } from "../../utils/templates/stuffMail";

export type SafeUser = Omit<User, "password">;

type CreateUserPayload = Omit<UserCreateInput, "employeeDetail"> & {
  employeeDetail?: EmployeeDetailCreateWithoutUserInput;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );

export const createEmployee = async (
  payload: CreateUserPayload,
): Promise<SafeUser> => {
  const email = payload.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt.saltRounds,
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      password: hashedPassword,
      role: payload.role ?? Role.SALESMAN,
      phone: payload.phone,
      status: payload.status ?? "ACTIVE",
      image: payload.image,
      employeeDetail: payload.employeeDetail
        ? { create: payload.employeeDetail }
        : undefined,
    },
  });

const emailTemplate = generateEmployeeWelcomeEmail({
  name: user.name,
  email,
  password: payload.password,
  role: user.role,
  phone: user.phone as string,
  joiningDate: new Date().toLocaleDateString("en-GB"),
  loginUrl: config.frontend.url,
  companyName: "CommerceOS",
});

await sendEmail({
  to: email,
  subject: `Welcome to CommerceOS — Your employee account`,
  text: emailTemplate.text,
  html: emailTemplate.html,
});

  return safeUser(user);
};

export const createUser = createEmployee;

export const getUsers = async (query: Record<string, any>) => {
  const result = await getAll<User>(prisma.user, query, [
    "name",
    "email",
    "phone",
  ]);

  return {
    data: result.data.map(safeUser),
    meta: result.meta,
  };
};

export const getUserById = async (userId: string): Promise<SafeUser> => {
  const user = await getById<User>(prisma.user, userId);
  return safeUser(user);
};

export const updateUserById = async (
  userId: string,
  payload: UserUpdateInput,
): Promise<SafeUser> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Delete old user image if replaced or removed
  await handleImageUpdate(existingUser, payload, "image");

  const user = await updateOne<User>(prisma.user, userId, {
    name: payload.name,
    phone: payload.phone,
    image: payload.image,
    role: payload.role,
    status: payload.status,
  } as Partial<User>);

  await clearUserCache(userId);

  return safeUser(user);
};

export const deleteUserById = async (userId: string): Promise<SafeUser> => {
  const existingUser = await getById<User>(prisma.user, userId);
  await deleteEntityImages(existingUser, "image");

  const user = await deleteOne<User>(prisma.user, userId);
  await clearUserCache(userId);
  return safeUser(user);
};


const toNumber = (value: any) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return 0;
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employeeDetail: true,
      salaryRecords: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
      },
      sales: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            select: {
              quantity: true,
            },
          },
          refunds: {
            include: {
              items: {
                select: {
                  quantity: true,
                  amount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const profile = safeUser(user) as any;

  const totalSales = user.sales.reduce(
    (sum, sale) => sum + toNumber(sale.total),
    0,
  );
  const totalPaid = user.sales.reduce(
    (sum, sale) => sum + toNumber(sale.paidAmount),
    0,
  );
  const totalDue = user.sales.reduce(
    (sum, sale) => sum + toNumber(sale.dueAmount),
    0,
  );
  const totalItemsSold = user.sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0,
  );
  const totalRefundAmount = user.sales.reduce(
    (sum, sale) =>
      sum + sale.refunds.reduce((refundSum, refund) => refundSum + toNumber(refund.amount), 0),
    0,
  );
  const totalRefundItems = user.sales.reduce(
    (sum, sale) =>
      sum + sale.refunds.reduce(
        (refundSum, refund) =>
          refundSum + refund.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0,
      ),
    0,
  );

  const salary = user.salaryRecords
    .slice(0, 12)
    .map((record) => ({
      id: record.id,
      month: record.month,
      year: record.year,
      baseSalary: toNumber(record.baseSalary),
      bonus: toNumber(record.bonus),
      deduction: toNumber(record.deduction),
      netPay: toNumber(record.netPay),
      status: record.status,
      paidAt: record.paidAt,
    }));

  delete profile.sales;
  delete profile.password;

  profile.salary = salary;
  profile.salesSummary = {
    totalSalesCount: user.sales.length,
    totalSales,
    totalPaid,
    totalDue,
    totalItemsSold,
    totalRefundAmount,
    totalRefundItems,
  };

  return profile;
};