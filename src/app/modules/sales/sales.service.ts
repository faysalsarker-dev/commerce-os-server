import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { $Enums } from "../../generated/prisma/client";
import { broadcastStockUpdate, type StockUpdatePayload } from "../../config/socket";

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
  const transactionResult = await prisma.$transaction(async (tx) => {
    const results: Array<{
      variantId: string;
      quantity: number;
      total: number;
    }> = [];
    const stockUpdates: StockUpdatePayload[] = [];

    for (const item of payload.items) {
      const variant = await tx.productVariant.findUnique({
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

      const updatedVariant = await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stockQty: variant.stockQty - item.quantity,
        },
      });

      await tx.stockMovement.create({
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

      stockUpdates.push({
        variantId: item.variantId,
        productId: variant.productColor?.product?.id,
        productName: variant.productColor?.product?.name,
        colorName: variant.productColor?.colorName,
        size: variant.size,
        stockQty: updatedVariant.stockQty,
        movementType: "SALE_OUT",
        updatedAt: new Date(),
      });
    }

    return {
      results,
      stockUpdates,
    };
  });

  for (const update of transactionResult.stockUpdates) {
    broadcastStockUpdate(update);
  }

  return {
    items: transactionResult.results,
    totalAmount: transactionResult.results.reduce((sum, item) => sum + item.total, 0),
  };
};

export const returnProduct = async (payload: {
  variantId: string;
  quantity: number;
  reason?: string;
}) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: payload.variantId },
      include: variantInclude,
    });

    if (!variant) {
      throw new AppError("Variant not found", 404);
    }

    const updatedVariant = await tx.productVariant.update({
      where: { id: payload.variantId },
      data: {
        stockQty: variant.stockQty + payload.quantity,
      },
    });

    await tx.stockMovement.create({
      data: {
        variantId: payload.variantId,
        type: $Enums.StockMovementType.RETURN_IN,
        quantity: payload.quantity,
        reason: payload.reason ?? "Customer return",
      },
    });

    return {
      updatedStock: updatedVariant.stockQty,
      stockUpdate: {
        variantId: payload.variantId,
        productId: variant.productColor?.product?.id,
        productName: variant.productColor?.product?.name,
        colorName: variant.productColor?.colorName,
        size: variant.size,
        stockQty: updatedVariant.stockQty,
        movementType: "RETURN_IN" as const,
        updatedAt: new Date(),
      } satisfies StockUpdatePayload,
    };
  });

  broadcastStockUpdate(transactionResult.stockUpdate);

  return {
    variantId: payload.variantId,
    returnedQuantity: payload.quantity,
    updatedStock: transactionResult.updatedStock,
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
