import { z } from "zod";
import { DiscountType, SaleChannel } from "../../generated/prisma/enums";

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Coupon code is required")
      .transform((val) => val.toUpperCase()),
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.coerce
      .number()
      .positive("Discount value must be greater than 0"),
    minOrderAmount: z.coerce
      .number()
      .min(0, "Minimum order amount cannot be negative")
      .optional()
      .nullable(),
    maxDiscountAmount: z.coerce
      .number()
      .min(0, "Maximum discount amount cannot be negative")
      .optional()
      .nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    usageLimit: z.coerce
      .number()
      .int("Usage limit must be an integer")
      .positive("Usage limit must be greater than 0")
      .optional()
      .nullable(),
    perCustomerLimit: z.coerce
      .number()
      .int("Per customer limit must be an integer")
      .positive("Per customer limit must be greater than 0")
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
    channel: z.nativeEnum(SaleChannel).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE) {
        return data.discountValue <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const updateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Coupon code cannot be empty")
      .transform((val) => val.toUpperCase())
      .optional(),
    title: z.string().trim().optional().nullable(),
    description: z.string().trim().optional().nullable(),
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.coerce
      .number()
      .positive("Discount value must be greater than 0")
      .optional(),
    minOrderAmount: z.coerce
      .number()
      .min(0, "Minimum order amount cannot be negative")
      .optional()
      .nullable(),
    maxDiscountAmount: z.coerce
      .number()
      .min(0, "Maximum discount amount cannot be negative")
      .optional()
      .nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    usageLimit: z.coerce
      .number()
      .int("Usage limit must be an integer")
      .positive("Usage limit must be greater than 0")
      .optional()
      .nullable(),
    perCustomerLimit: z.coerce
      .number()
      .int("Per customer limit must be an integer")
      .positive("Per customer limit must be greater than 0")
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
    channel: z.nativeEnum(SaleChannel).optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.discountType === DiscountType.PERCENTAGE &&
        data.discountValue !== undefined
      ) {
        return data.discountValue <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update coupon",
  });

export const validateCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Coupon code is required")
    .transform((val) => val.toUpperCase()),
  orderAmount: z.coerce
    .number()
    .positive("Order amount must be greater than 0"),
  customerId: z.string().optional().nullable(),
  channel: z.nativeEnum(SaleChannel).optional().nullable(),
});

