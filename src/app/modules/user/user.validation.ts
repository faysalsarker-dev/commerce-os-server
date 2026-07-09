import { z } from "zod";
import { EmployeeStatus, Role } from "../../generated/prisma/enums";

const roleEnum = z.nativeEnum(Role);
const statusEnum = z.nativeEnum(EmployeeStatus);

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(6, "Phone must be at least 6 characters").optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  image: z.string().url("Image must be a valid URL").optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    phone: z.string().min(6, "Phone must be at least 6 characters").optional(),
    image: z.string().url("Image must be a valid URL").optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
  })
  .refine(
    (data) => Boolean(data.name || data.phone || data.image || data.role || data.status),
    {
      message: "At least one field must be provided to update user",
    },
  );
