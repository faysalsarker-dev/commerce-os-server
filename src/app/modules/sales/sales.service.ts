import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { ProductVariant, StockMovement } from "../../generated/prisma/client";
import { $Enums } from "../../generated/prisma/client";

const variantInclude = {
  productColor: {
    include: {
      product: true,
    },
  },
};

const stockMovementInclude = {
  variant: {
    include: {
      productColor: {
        include: {
          product: true,
        },
      },
    },
  },
};

export const scanProduct = async (code: string) => {
  const variant = await prisma.productVariant.findFirst({
    where: {
      OR: [
        { sku: code },
        { qrCode: code },
      ],
    },
    include: variantInclude,
  });

  if (!variant) {
    throw new AppError("Product not found for the provided scan code", 404);
  }

  return {
    ...variant,
    productName: variant.productColor?.product?.name,
    colorName: variant.productColor?.colorName,
    sellingPrice:
      variant.sellingPriceOverride ?? variant.productColor?.product?.sellingPrice,
    stockQty: variant.stockQty,
  };
};

export const checkoutSale = async (payload: {
  items: Array<{
    variantId: string;
    quantity: number;
    reason?: string;
  }>;
}) => {
  const results: Array<{
    variantId: string;
    quantity: number;
    total: number;
  }> = [];

  for (const item of payload.items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: variantInclude,
    });

    if (!variant) {
      throw new AppError(`Variant ${item.variantId} not found`, 404);
    }

    if (variant.stockQty < item.quantity) {
      throw new AppError(
        `Insufficient stock for ${variant.productColor?.product?.name} ${variant.size}`,
        400,
      );
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id: item.variantId },
      data: {
        stockQty: variant.stockQty - item.quantity,
      },
    });

    await prisma.stockMovement.create({
      data: {
        variantId: item.variantId,
        type: $Enums.StockMovementType.SALE_OUT,
        quantity: item.quantity,
        reason: item.reason ?? "Sale checkout",
      },
    });

    const unitPrice =
      variant.sellingPriceOverride ?? variant.productColor?.product?.sellingPrice ?? 0;

    results.push({
      variantId: item.variantId,
      quantity: item.quantity,
      total: Number(unitPrice) * item.quantity,
    });

    if (!updatedVariant) {
      throw new AppError("Sale update failed", 500);
    }
  }

  return {
    items: results,
    totalAmount: results.reduce((sum, item) => sum + item.total, 0),
  };
};

export const returnProduct = async (payload: {
  variantId: string;
  quantity: number;
  reason?: string;
}) => {
  const variant = await prisma.productVariant.findUnique({
    where: { id: payload.variantId },
    include: variantInclude,
  });

  if (!variant) {
    throw new AppError("Variant not found", 404);
  }

  const updatedVariant = await prisma.productVariant.update({
    where: { id: payload.variantId },
    data: {
      stockQty: variant.stockQty + payload.quantity,
    },
  });

  await prisma.stockMovement.create({
    data: {
      variantId: payload.variantId,
      type: $Enums.StockMovementType.RETURN_IN,
      quantity: payload.quantity,
      reason: payload.reason ?? "Customer return",
    },
  });

  return {
    variantId: payload.variantId,
    returnedQuantity: payload.quantity,
    updatedStock: updatedVariant.stockQty,
  };
};

export const getSalesHistory = async () => {
  const movements = await prisma.stockMovement.findMany({
    where: {
      type: {
        in: [$Enums.StockMovementType.SALE_OUT, $Enums.StockMovementType.RETURN_IN],
      },
    },
    include: stockMovementInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return movements;
};
