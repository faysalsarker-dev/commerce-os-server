import { z } from "zod";
import { EmployeeStatus, Role, SalaryStatus } from "../../generated/prisma/enums";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const roleEnum = z.nativeEnum(Role);
const statusEnum = z.nativeEnum(EmployeeStatus);

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  password: z.coerce.string().min(6, "Password must be at least 6 characters"),
  phone: z.preprocess(
    emptyToUndefined,
    z.string().min(6, "Phone must be at least 6 characters").optional(),
  ),
  role: z.preprocess(emptyToUndefined, roleEnum.optional()),
  status: z.preprocess(emptyToUndefined, statusEnum.optional()),
  image: z.preprocess(
    emptyToUndefined,
    z.string().url("Image must be a valid URL").optional(),
  ),
  employeeDetail: z
    .object({
      designation: z.preprocess(emptyToUndefined, z.string().optional()),
      joinDate: z.coerce.date(),
      baseSalary: z.coerce.number().nonnegative(),
      nidNumber: z.preprocess(emptyToUndefined, z.string().optional()),
      birthCertificateNumber: z.preprocess(
        emptyToUndefined,
        z.string().optional(),
      ),
      address: z.preprocess(emptyToUndefined, z.string().optional()),
      emergencyContact: z.preprocess(
        emptyToUndefined,
        z.string().optional(),
      ),
    })
    .optional(),
});

export const updateUserSchema = z
  .object({
    name: z.preprocess(
      emptyToUndefined,
      z.string().min(2, "Name must be at least 2 characters").optional(),
    ),
    phone: z.preprocess(
      emptyToUndefined,
      z.string().min(6, "Phone must be at least 6 characters").optional(),
    ),
    image: z.preprocess(
      emptyToUndefined,
      z.string().url("Image must be a valid URL").optional(),
    ),
    role: z.preprocess(emptyToUndefined, roleEnum.optional()),
    status: z.preprocess(emptyToUndefined, statusEnum.optional()),
  })
  .refine(
    (data) => Boolean(data.name || data.phone || data.image || data.role || data.status),
    {
      message: "At least one field must be provided to update user",
    },
  );

const moneyAmount = z.number().finite().nonnegative();

export const createSalaryRecordSchema = z
  .object({
    userId: z.string().trim().min(1),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(9999),
    baseSalary: moneyAmount.optional(),
    bonus: moneyAmount.optional(),
    deduction: moneyAmount.optional(),
    status: z.nativeEnum(SalaryStatus).optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      data.baseSalary === undefined ||
      (data.baseSalary ?? 0) + (data.bonus ?? 0) >= (data.deduction ?? 0),
    {
      message: "Deduction cannot exceed base salary plus bonus",
      path: ["deduction"],
    },
  );

export const updateSalaryRecordSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(9999).optional(),
    baseSalary: moneyAmount.optional(),
    bonus: moneyAmount.optional(),
    deduction: moneyAmount.optional(),
    status: z.nativeEnum(SalaryStatus).optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the salary record",
  });

export const increaseSalarySchema = z.object({
  userId: z.string().trim().min(1),
  amount: z.number().finite().positive(),
});

export const salaryListQuerySchema = z.object({
  month: z.union([z.coerce.number().int().min(1).max(12), z.literal("all")]).optional(),
  year: z.coerce.number().int().min(2000).max(9999).optional(),
  userId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(SalaryStatus).optional(),
  searchTerm: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["name", "baseSalary", "bonus", "deduction", "netPay", "status", "month", "year", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
