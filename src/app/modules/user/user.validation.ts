import { z } from "zod";
import { EmployeeStatus, Role } from "../../generated/prisma/enums";

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
