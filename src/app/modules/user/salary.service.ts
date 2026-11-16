import { Prisma, SalaryRecord } from "../../generated/prisma/client";
import { SalaryStatus } from "../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createSalaryRecordSchema,
  increaseSalarySchema,
  salaryListQuerySchema,
  updateSalaryRecordSchema,
} from "./user.validation";
import { z } from "zod";

type CreateSalaryRecordInput = z.infer<typeof createSalaryRecordSchema>;
type UpdateSalaryRecordInput = z.infer<typeof updateSalaryRecordSchema>;
type IncreaseSalaryInput = z.infer<typeof increaseSalarySchema>;

const salaryRecordInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },
};

const serializeSalaryRecord = <T extends SalaryRecord>(record: T) => ({
  ...record,
  baseSalary: Number(record.baseSalary),
  bonus: Number(record.bonus),
  deduction: Number(record.deduction),
  netPay: Number(record.netPay),
});

const calculateNetPay = (
  baseSalary: number | Prisma.Decimal,
  bonus: number | Prisma.Decimal,
  deduction: number | Prisma.Decimal,
) => {
  const netPay = new Prisma.Decimal(baseSalary)
    .plus(bonus)
    .minus(deduction);

  if (netPay.isNegative()) {
    throw new AppError("Deduction cannot exceed base salary plus bonus", 400);
  }

  return netPay;
};

export const createSalaryRecord = async (payload: CreateSalaryRecordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      employeeDetail: { select: { baseSalary: true } },
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (!user.employeeDetail) {
    throw new AppError("Employee salary details not found", 404);
  }

  const baseSalary = new Prisma.Decimal(
    payload.baseSalary ?? user.employeeDetail.baseSalary,
  );
  const bonus = new Prisma.Decimal(payload.bonus ?? 0);
  const deduction = new Prisma.Decimal(payload.deduction ?? 0);
  const status = payload.status ?? SalaryStatus.PENDING;

  const record = await prisma.salaryRecord.create({
    data: {
      userId: payload.userId,
      month: payload.month,
      year: payload.year,
      baseSalary,
      bonus,
      deduction,
      netPay: calculateNetPay(baseSalary, bonus, deduction),
      status,
      paidAt: status === SalaryStatus.PAID ? new Date() : null,
      notes: payload.notes,
    },
    include: salaryRecordInclude,
  });

  return serializeSalaryRecord(record);
};

export const getSalaryRecords = async (query: Record<string, unknown>) => {
  const parsed = salaryListQuerySchema.parse(query);
  const now = new Date();
  const month =
    parsed.month ?? (parsed.year === undefined ? now.getMonth() + 1 : "all");
  const year = parsed.year ?? now.getFullYear();

  const where: Prisma.SalaryRecordWhereInput = {
    ...(month !== "all" && { month }),
    year,
    ...(parsed.userId && { userId: parsed.userId }),
    ...(parsed.status && { status: parsed.status }),
    ...(parsed.searchTerm && {
      user: {
        OR: [
          { name: { contains: parsed.searchTerm, mode: "insensitive" } },
          { email: { contains: parsed.searchTerm, mode: "insensitive" } },
          { phone: { contains: parsed.searchTerm, mode: "insensitive" } },
        ],
      },
    }),
  };

  const direction = parsed.sortOrder;
  const salarySortOrderBy = {
    baseSalary: { baseSalary: direction },
    bonus: { bonus: direction },
    deduction: { deduction: direction },
    netPay: { netPay: direction },
    status: { status: direction },
    month: { month: direction },
    year: { year: direction },
    createdAt: { createdAt: direction },
  } satisfies Record<
    Exclude<typeof parsed.sortBy, "name">,
    Prisma.SalaryRecordOrderByWithRelationInput
  >;
  const orderBy: Prisma.SalaryRecordOrderByWithRelationInput[] =
    parsed.sortBy === "name"
      ? [{ user: { name: direction } }, { year: "desc" }, { month: "desc" }]
      : [salarySortOrderBy[parsed.sortBy]];

  const [records, total] = await Promise.all([
    prisma.salaryRecord.findMany({
      where,
      include: salaryRecordInclude,
      orderBy,
      skip: (parsed.page - 1) * parsed.limit,
      take: parsed.limit,
    }),
    prisma.salaryRecord.count({ where }),
  ]);
  const totalPages = Math.ceil(total / parsed.limit);

  return {
    data: records.map(serializeSalaryRecord),
    meta: {
      total,
      page: parsed.page,
      limit: parsed.limit,
      totalPages,
      hasNextPage: parsed.page < totalPages,
      hasPrevPage: parsed.page > 1,
      filters: { month, year, status: parsed.status ?? null },
    },
  };
};

export const getSalaryRecordById = async (id: string) => {
  const record = await prisma.salaryRecord.findUnique({
    where: { id },
    include: salaryRecordInclude,
  });
  if (!record) throw new AppError("Salary record not found", 404);
  return serializeSalaryRecord(record);
};

export const getUserSalaryHistory = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      employeeDetail: true,
      salaryRecords: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
    },
  });
  if (!user) throw new AppError("User not found", 404);

  return {
    ...user,
    employeeDetail: user.employeeDetail
      ? {
          ...user.employeeDetail,
          baseSalary: Number(user.employeeDetail.baseSalary),
        }
      : null,
    salaryRecords: user.salaryRecords.map(serializeSalaryRecord),
  };
};

export const updateSalaryRecord = async (
  id: string,
  payload: UpdateSalaryRecordInput,
) => {
  const current = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!current) throw new AppError("Salary record not found", 404);

  const baseSalary = payload.baseSalary ?? current.baseSalary;
  const bonus = payload.bonus ?? current.bonus;
  const deduction = payload.deduction ?? current.deduction;
  const status = payload.status ?? current.status;
  const paidAt =
    status === SalaryStatus.PAID
      ? current.status === SalaryStatus.PAID
        ? current.paidAt
        : new Date()
      : null;

  const record = await prisma.salaryRecord.update({
    where: { id },
    data: {
      ...payload,
      baseSalary: new Prisma.Decimal(baseSalary),
      bonus: new Prisma.Decimal(bonus),
      deduction: new Prisma.Decimal(deduction),
      netPay: calculateNetPay(baseSalary, bonus, deduction),
      paidAt,
    },
    include: salaryRecordInclude,
  });

  return serializeSalaryRecord(record);
};

export const deleteSalaryRecord = async (id: string) => {
  const record = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!record) throw new AppError("Salary record not found", 404);
  await prisma.salaryRecord.delete({ where: { id } });
  return serializeSalaryRecord(record);
};

export const increaseEmployeeSalary = async (
  payload: IncreaseSalaryInput,
) => {
  const employeeDetail = await prisma.employeeDetail.findUnique({
    where: { userId: payload.userId },
    select: { id: true },
  });
  if (!employeeDetail) {
    const userExists = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });
    if (!userExists) throw new AppError("User not found", 404);
    throw new AppError("Employee salary details not found", 404);
  }

  const updated = await prisma.employeeDetail.update({
    where: { userId: payload.userId },
    data: { baseSalary: { increment: new Prisma.Decimal(payload.amount) } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
    },
  });

  return {
    ...updated,
    baseSalary: Number(updated.baseSalary),
    user: updated.user,
  };
};
