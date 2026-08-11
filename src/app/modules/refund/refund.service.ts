import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { $Enums, Prisma } from "../../generated/prisma/client";
import { broadcastStockUpdate, type StockUpdatePayload } from "../../config/socket";
import { deleteOne, getAll, getById } from "../../services/base.service";
import { Refund } from "../../generated/prisma/client";

export type CreateRefundPayload = {
  saleId: string;
  items: Array<{
    saleItemId: string;
    quantity: number;
    amount?: number;
  }>;
  method?:
    | "CASH"
    | "BKASH"
    | "NAGAD"
    | "ROCKET"
    | "CARD"
    | "BANK_TRANSFER"
    | "BANK"
    | "OTHER";
  reason?: string;
  processedById?: string;
};

const mapPaymentMethod = (method?: string): $Enums.PaymentMethod => {
  switch (method?.toUpperCase()) {
    case "BKASH":
      return $Enums.PaymentMethod.BKASH;
    case "NAGAD":
      return $Enums.PaymentMethod.NAGAD;
    case "ROCKET":
      return $Enums.PaymentMethod.ROCKET;
    case "CARD":
      return $Enums.PaymentMethod.CARD;
    case "BANK":
    case "BANK_TRANSFER":
      return $Enums.PaymentMethod.BANK_TRANSFER;
    case "CASH":
    case "OTHER":
    default:
      return $Enums.PaymentMethod.CASH;
  }
};

export const createRefund = async (payload: CreateRefundPayload) => {
  const refundMethod = mapPaymentMethod(payload.method);

  const transactionResult = await prisma.$transaction(async (tx) => {
    // 1. Fetch sale with existing items and refunds
    const sale = await tx.sale.findUnique({
      where: { id: payload.saleId },
      include: {
        items: true,
        refunds: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sale) {
      throw new AppError("Sale not found", 404);
    }

    // Resolve staff user
    let processedById = payload.processedById?.trim();
    if (processedById) {
      const staffUser = await tx.user.findUnique({ where: { id: processedById } });
      if (!staffUser) {
        processedById = undefined;
      }
    }

    if (!processedById) {
      const fallbackUser =
        (await tx.user.findFirst({
          where: { status: $Enums.EmployeeStatus.ACTIVE },
        })) ?? (await tx.user.findFirst());

      if (!fallbackUser) {
        throw new AppError("No staff/user found to process refund.", 400);
      }
      processedById = fallbackUser.id;
    }

    // Map existing refunded quantities per saleItemId
    const refundedQtyMap = new Map<string, number>();
    for (const ref of sale.refunds) {
      for (const refItem of ref.items) {
        const current = refundedQtyMap.get(refItem.saleItemId) ?? 0;
        refundedQtyMap.set(refItem.saleItemId, current + refItem.quantity);
      }
    }

    const preparedRefundItems: Prisma.RefundItemCreateWithoutRefundInput[] = [];
    const stockUpdates: StockUpdatePayload[] = [];
    let totalRefundAmount = 0;

    for (const itemInput of payload.items) {
      const saleItem = sale.items.find((si) => si.id === itemInput.saleItemId);

      if (!saleItem) {
        throw new AppError(
          `Sale item ${itemInput.saleItemId} does not belong to sale ${payload.saleId}`,
          400,
        );
      }

      const alreadyRefundedQty = refundedQtyMap.get(saleItem.id) ?? 0;
      const maxRefundableQty = saleItem.quantity - alreadyRefundedQty;

      if (itemInput.quantity > maxRefundableQty) {
        throw new AppError(
          `Cannot refund ${itemInput.quantity} units for product ${saleItem.productName}. Maximum refundable: ${maxRefundableQty}`,
          400,
        );
      }

      // Compute item refund amount if not passed explicitly
      const perUnitSubtotal = Number(saleItem.subtotal) / saleItem.quantity;
      const calculatedAmount =
        itemInput.amount !== undefined
          ? itemInput.amount
          : perUnitSubtotal * itemInput.quantity;

      totalRefundAmount += calculatedAmount;

      // 2. Increment stock quantity in ProductVariant
      const updatedVariant = await tx.productVariant.update({
        where: { id: saleItem.variantId },
        data: {
          stockQty: { increment: itemInput.quantity },
        },
        include: {
          productColor: {
            include: {
              product: true,
            },
          },
        },
      });

      // 3. Create StockMovement for return
      await tx.stockMovement.create({
        data: {
          variantId: saleItem.variantId,
          type: $Enums.StockMovementType.RETURN_IN,
          quantity: itemInput.quantity,
          reason: payload.reason ?? `Refund for Sale ${sale.invoiceNo}`,
        },
      });

      preparedRefundItems.push({
        saleItem: { connect: { id: saleItem.id } },
        variantId: saleItem.variantId,
        quantity: itemInput.quantity,
        amount: calculatedAmount,
      });

      stockUpdates.push({
        variantId: saleItem.variantId,
        productId: updatedVariant.productColor?.product?.id,
        productName: updatedVariant.productColor?.product?.name,
        colorName: updatedVariant.productColor?.colorName,
        size: updatedVariant.size,
        stockQty: updatedVariant.stockQty,
        movementType: "RETURN_IN",
        updatedAt: new Date(),
      });

      refundedQtyMap.set(saleItem.id, alreadyRefundedQty + itemInput.quantity);
    }

    // 4. Create Refund record with nested RefundItems
    const refund = await tx.refund.create({
      data: {
        saleId: sale.id,
        amount: totalRefundAmount,
        method: refundMethod,
        reason: payload.reason ?? null,
        processedById,
        items: {
          create: preparedRefundItems,
        },
      },
      include: {
        items: {
          include: {
            saleItem: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 5. Update Sale refundedAmount and statuses
    const newTotalRefunded = Number(sale.refundedAmount) + totalRefundAmount;

    let isFullyRefunded = true;
    for (const si of sale.items) {
      const refQty = refundedQtyMap.get(si.id) ?? 0;
      if (refQty < si.quantity) {
        isFullyRefunded = false;
        break;
      }
    }

    const newSaleStatus = isFullyRefunded
      ? $Enums.SaleStatus.RETURNED
      : $Enums.SaleStatus.PARTIALLY_RETURNED;

    const newPaymentStatus = isFullyRefunded
      ? $Enums.PaymentStatus.REFUNDED
      : $Enums.PaymentStatus.PARTIALLY_REFUNDED;

    const updatedSale = await tx.sale.update({
      where: { id: sale.id },
      data: {
        refundedAmount: newTotalRefunded,
        status: newSaleStatus,
        paymentStatus: newPaymentStatus,
      },
    });

    return {
      refund,
      sale: updatedSale,
      stockUpdates,
    };
  });

  for (const update of transactionResult.stockUpdates) {
    broadcastStockUpdate(update);
  }

  return {
    refund: transactionResult.refund,
    sale: transactionResult.sale,
  };
};

export const getRefunds = async (query: Record<string, any>) => {
  const result = await getAll<Refund>(prisma.refund, query, ["reason"], {
    sale: {
      include: {
        customer: true,
      },
    },
    items: {
      include: {
        saleItem: true,
      },
    },
    processedBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  });

  return {
    data: result.data,
    meta: result.meta,
  };
};

export const getRefundById = async (id: string): Promise<Refund> => {
  const refund = await getById<Refund>(prisma.refund, id, {
    sale: {
      include: {
        customer: true,
      },
    },
    items: {
      include: {
        saleItem: true,
      },
    },
    processedBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  });

  return refund;
};

export const getRefundsBySaleId = async (saleId: string) => {
  const refunds = await prisma.refund.findMany({
    where: { saleId },
    include: {
      items: {
        include: {
          saleItem: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return refunds;
};

export const deleteRefundById = async (id: string): Promise<Refund> => {
  const refund = await deleteOne<Refund>(prisma.refund, id);
  return refund;
};
