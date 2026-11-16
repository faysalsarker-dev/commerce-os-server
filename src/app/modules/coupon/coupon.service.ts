import { Coupon, Prisma } from "../../generated/prisma/client";
import { DiscountType } from "../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupon.validation";
import { z } from "zod";

type CreateCouponInput = z.infer<typeof createCouponSchema>;
type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const createCoupon = async (
  payload: CreateCouponInput,
  userId?: string,
): Promise<Coupon> => {
  const existingCoupon = await prisma.coupon.findUnique({
    where: { code: payload.code },
  });

  if (existingCoupon) {
    throw new AppError(`Coupon code "${payload.code}" already exists`, 400);
  }

  const {
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    ...restData
  } = payload;

  const data: Record<string, any> = {
    ...restData,
    discountValue: new Prisma.Decimal(discountValue),
    minOrderAmount:
      minOrderAmount !== undefined && minOrderAmount !== null
        ? new Prisma.Decimal(minOrderAmount)
        : null,
    maxDiscountAmount:
      maxDiscountAmount !== undefined && maxDiscountAmount !== null
        ? new Prisma.Decimal(maxDiscountAmount)
        : null,
    ...(userId && { createdById: userId }),
  };

  return createOne<Coupon>(prisma.coupon, data, {
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  });
};

export const getCoupons = async (query: Record<string, any>) => {
  return getAll<Coupon>(
    prisma.coupon,
    query,
    ["code", "title", "description"],
    {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          usages: true,
          sales: true,
        },
      },
    },
  );
};

export const getCouponById = async (id: string): Promise<Coupon> => {
  return getById<Coupon>(prisma.coupon, id, {
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    _count: {
      select: {
        usages: true,
        sales: true,
      },
    },
  });
};

export const updateCouponById = async (
  id: string,
  payload: UpdateCouponInput,
): Promise<Coupon> => {
  const currentCoupon = await getById<Coupon>(prisma.coupon, id);

  if (payload.code && payload.code !== currentCoupon.code) {
    const duplicate = await prisma.coupon.findUnique({
      where: { code: payload.code },
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`Coupon code "${payload.code}" already exists`, 400);
    }
  }

  const {
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    ...restUpdates
  } = payload;

  const data: Record<string, any> = {
    ...restUpdates,
    ...(discountValue !== undefined && {
      discountValue: new Prisma.Decimal(discountValue),
    }),
    ...(minOrderAmount !== undefined && {
      minOrderAmount:
        minOrderAmount === null ? null : new Prisma.Decimal(minOrderAmount),
    }),
    ...(maxDiscountAmount !== undefined && {
      maxDiscountAmount:
        maxDiscountAmount === null ? null : new Prisma.Decimal(maxDiscountAmount),
    }),
  };

  return updateOne<Coupon>(prisma.coupon, id, data, {
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  });
};

export const deleteCouponById = async (id: string): Promise<Coupon> => {
  const usageCount = await prisma.couponUsage.count({
    where: { couponId: id },
  });

  if (usageCount > 0) {
    throw new AppError(
      "Cannot delete a coupon that has already been used in sales. Deactivate it instead.",
      400,
    );
  }

  return deleteOne<Coupon>(prisma.coupon, id);
};

export const validateCoupon = async (payload: ValidateCouponInput) => {
  const { code, orderAmount, customerId, channel } = payload;

  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    throw new AppError(`Coupon code "${code}" not found`, 404);
  }

  if (!coupon.isActive) {
    throw new AppError("This coupon is no longer active", 400);
  }

  const now = new Date();

  if (coupon.startDate && now < coupon.startDate) {
    throw new AppError("This coupon is not valid yet", 400);
  }

  if (coupon.endDate && now > coupon.endDate) {
    throw new AppError("This coupon has expired", 400);
  }

  if (coupon.channel && channel && coupon.channel !== channel) {
    throw new AppError(
      `This coupon is only valid for ${coupon.channel.toLowerCase()} sales`,
      400,
    );
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError(
      "This coupon has reached its maximum usage limit",
      400,
    );
  }

  if (
    coupon.minOrderAmount !== null &&
    orderAmount < Number(coupon.minOrderAmount)
  ) {
    throw new AppError(
      `Minimum order amount of ${coupon.minOrderAmount} is required to use this coupon`,
      400,
    );
  }

  if (customerId && coupon.perCustomerLimit !== null) {
    const customerUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        customerId,
      },
    });

    if (customerUsageCount >= coupon.perCustomerLimit) {
      throw new AppError(
        "You have reached the maximum redemption limit for this coupon",
        400,
      );
    }
  }

  let calculatedDiscount = 0;

  if (coupon.discountType === DiscountType.PERCENTAGE) {
    calculatedDiscount = (orderAmount * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscountAmount !== null) {
      calculatedDiscount = Math.min(
        calculatedDiscount,
        Number(coupon.maxDiscountAmount),
      );
    }
  } else {
    calculatedDiscount = Math.min(orderAmount, Number(coupon.discountValue));
  }

  const discountAmount = Number(calculatedDiscount.toFixed(2));
  const finalAmount = Number(
    Math.max(0, orderAmount - discountAmount).toFixed(2),
  );

  return {
    coupon,
    discountAmount,
    finalAmount,
  };
};

