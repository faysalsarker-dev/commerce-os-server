import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const roleEnum = z.enum([
  "SUPER_ADMIN",
  "MARKETER",
  "ONLINE_SALESMAN",
  "OFFLINE_SALESMAN",
]);

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.preprocess(
    emptyToUndefined,
    z.string().min(6, "Phone must be at least 6 characters").optional(),
  ),
  role: z.preprocess(emptyToUndefined, roleEnum.optional()),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z
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
  })
  .refine((data) => Boolean(data.name || data.phone || data.image), {
    message: "At least one field must be provided to update profile",
  });

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
