import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { $Enums, Prisma } from "../../generated/prisma/client";
import { broadcastStockUpdate, type StockUpdatePayload } from "../../config/socket";
import { getAll, getById } from "../../services/base.service";
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
    | "OTHER"
    | "MIX";
  payments?: Array<{
    method: $Enums.PaymentMethod;
    amount: number;
    reference?: string;
  }>;
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
    case "MIX":
      return $Enums.PaymentMethod.MIX;
    case "CASH":
    case "OTHER":
    default:
      return $Enums.PaymentMethod.CASH;
  }
};

export const createRefund = async (payload: CreateRefundPayload) => {
  if (payload.method?.toUpperCase() === "MIX" && !payload.payments) {
    throw new AppError(
      "MIX refund method requires individual refund payment entries.",
      400,
    );
  }

  const refundMethod = mapPaymentMethod(payload.method);

  const transactionResult = await prisma.$transaction(async (tx) => {
    const lockIds = [...new Set(payload.items.map((item) => item.saleItemId))].sort();
    if (lockIds.length) {
      await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT "id" FROM "SaleItem" WHERE "id" IN (${Prisma.join(lockIds)}) ORDER BY "id" FOR UPDATE`,
      );
    }
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
        exchanges: { include: { items: true } },
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
    const processedQtyMap = new Map(refundedQtyMap);
    for (const exchange of sale.exchanges) {
      for (const exchangeItem of exchange.items) {
        const current = processedQtyMap.get(exchangeItem.originalSaleItemId) ?? 0;
        processedQtyMap.set(
          exchangeItem.originalSaleItemId,
          current + exchangeItem.quantity,
        );
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

      const alreadyRefundedQty = processedQtyMap.get(saleItem.id) ?? 0;
      const maxRefundableQty = saleItem.quantity - alreadyRefundedQty;

      if (itemInput.quantity > maxRefundableQty) {
        throw new AppError(
          `Cannot refund ${itemInput.quantity} units for product ${saleItem.productName}. Maximum refundable: ${maxRefundableQty}`,
          400,
        );
      }

      // Compute item refund amount if not passed explicitly
      const perUnitSubtotal = Number(saleItem.subtotal) / saleItem.quantity;
      const calculatedAmount = Math.round(
        (itemInput.amount !== undefined
          ? itemInput.amount
          : perUnitSubtotal * itemInput.quantity) * 100,
      ) / 100;

      totalRefundAmount += calculatedAmount;

      // 2. Increment stock quantity in ProductVariant
      const updatedVariant = await tx.productVariant.update({
        where: { id: saleItem.variantId },
        data: {
          stockQty: { increment: itemInput.quantity },
        },
        include: {
          size: true,
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
        size: updatedVariant.size.size,
        stockQty: updatedVariant.stockQty,
        movementType: "RETURN_IN",
        updatedAt: new Date(),
      });

      processedQtyMap.set(saleItem.id, alreadyRefundedQty + itemInput.quantity);
      refundedQtyMap.set(
        saleItem.id,
        (refundedQtyMap.get(saleItem.id) ?? 0) + itemInput.quantity,
      );
    }

    const refundPayments = payload.payments
      ? payload.payments.map((payment) => ({
          method: payment.method,
          amount: Math.round(payment.amount * 100) / 100,
          reference: payment.reference ?? null,
        }))
      : [
          {
            method: refundMethod,
            amount: Math.round(totalRefundAmount * 100) / 100,
            reference: null,
          },
        ];
    const refundPaymentCents = refundPayments.reduce(
      (sum, payment) => sum + Math.round(payment.amount * 100),
      0,
    );
    const totalRefundCents = Math.round(totalRefundAmount * 100);

    if (refundPaymentCents !== totalRefundCents) {
      throw new AppError(
        "Refund payment amounts must equal the total refund amount.",
        400,
      );
    }
    if (
      Math.round(Number(sale.refundedAmount) * 100) + totalRefundCents >
      Math.round(Number(sale.total) * 100)
    ) {
      throw new AppError("Refund amount cannot exceed the remaining sale value.", 400);
    }
    if (
      totalRefundCents >
      Math.round((Number(sale.paidAmount) - Number(sale.refundedAmount)) * 100)
    ) {
      throw new AppError("Refund amount cannot exceed the sale's remaining collected payments.", 400);
    }

    const refundMethods = new Set(refundPayments.map((payment) => payment.method));
    const aggregateRefundMethod =
      refundMethods.size > 1
        ? $Enums.PaymentMethod.MIX
        : refundPayments[0].method;

    // 4. Create Refund record with its item and payout ledgers
    const refund = await tx.refund.create({
      data: {
        saleId: sale.id,
        amount: totalRefundAmount,
        method: aggregateRefundMethod,
        reason: payload.reason ?? null,
        processedById,
        items: {
          create: preparedRefundItems,
        },
        payments: {
          create: refundPayments,
        },
      },
      include: {
        payments: true,
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
    if (isFullyRefunded) {
      const linkedOrder = await tx.order.findUnique({
        where: { saleId: sale.id },
        select: { id: true, status: true },
      });
      if (linkedOrder && linkedOrder.status !== "RETURNED") {
        await tx.order.update({
          where: { id: linkedOrder.id },
          data: { status: "RETURNED" },
        });
        await tx.orderStatusHistory.create({
          data: { orderId: linkedOrder.id, status: "RETURNED", changedById: processedById },
        });
      }
    }

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
    payments: true,
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
    payments: true,
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
      payments: true,
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

export const getExchangesBySaleId = async (saleId: string) => {
  return prisma.exchange.findMany({
    where: { saleId },
    include: {
      items: { include: { originalSaleItem: true, originalVariant: true, replacementVariant: true } },
      processedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createExchange = async (payload: {
  saleId: string;
  reason?: string;
  processedById?: string;
  items: Array<{ saleItemId: string; replacementVariantId: string; quantity: number }>;
}) => {
  const stockUpdates: StockUpdatePayload[] = [];
  const exchange = await prisma.$transaction(async (tx) => {
    const saleItemIds = [...new Set(payload.items.map((item) => item.saleItemId))].sort();
    await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "SaleItem" WHERE "id" IN (${Prisma.join(saleItemIds)}) ORDER BY "id" FOR UPDATE`,
    );

    const sale = await tx.sale.findUnique({
      where: { id: payload.saleId },
      include: {
        items: true,
        refunds: { include: { items: true } },
        exchanges: { include: { items: true } },
      },
    });
    if (!sale) throw new AppError("Sale not found", 404);

    const processed = new Map<string, number>();
    for (const refund of sale.refunds) {
      for (const item of refund.items) {
        processed.set(item.saleItemId, (processed.get(item.saleItemId) ?? 0) + item.quantity);
      }
    }
    for (const priorExchange of sale.exchanges) {
      for (const item of priorExchange.items) {
        processed.set(item.originalSaleItemId, (processed.get(item.originalSaleItemId) ?? 0) + item.quantity);
      }
    }

    const itemCreates: Prisma.ExchangeItemCreateWithoutExchangeInput[] = [];
    for (const input of payload.items) {
      const soldItem = sale.items.find((item) => item.id === input.saleItemId);
      if (!soldItem) throw new AppError("Sale item does not belong to this sale", 400);
      const consumed = processed.get(soldItem.id) ?? 0;
      if (input.quantity > soldItem.quantity - consumed) {
        throw new AppError(`Only ${soldItem.quantity - consumed} unit(s) remain eligible for exchange.`, 409);
      }
      const replacement = await tx.productVariant.findUnique({
        where: { id: input.replacementVariantId },
        include: { size: true, productColor: { include: { product: true } } },
      });
      if (!replacement) throw new AppError("Replacement variant not found", 404);
      if (replacement.id === soldItem.variantId) {
        throw new AppError("Replacement must be a different variant", 400);
      }
      const replacementPrice = Number(
        replacement.sellingPriceOverride ?? replacement.productColor.product.sellingPrice,
      );
      const originalUnitPrice = Number(soldItem.subtotal) / soldItem.quantity;
      const difference = Math.round((replacementPrice - originalUnitPrice) * 100) / 100;
      if (Math.abs(difference) > 0.009) {
        throw new AppError("This exchange requires a price settlement and cannot be balanced automatically.", 409);
      }

      const stockResult = await tx.productVariant.updateMany({
        where: { id: replacement.id, stockQty: { gte: input.quantity } },
        data: { stockQty: { decrement: input.quantity } },
      });
      if (!stockResult.count) throw new AppError("Insufficient replacement stock", 409);
      const returnedVariant = await tx.productVariant.update({
        where: { id: soldItem.variantId },
        data: { stockQty: { increment: input.quantity } },
        include: { size: true, productColor: { include: { product: true } } },
      });
      const replacementAfter = await tx.productVariant.findUniqueOrThrow({
        where: { id: replacement.id },
        include: { size: true, productColor: { include: { product: true } } },
      });
      await tx.stockMovement.createMany({ data: [
        { variantId: replacement.id, type: "SALE_OUT", quantity: input.quantity, reason: "Customer exchange replacement" },
        { variantId: soldItem.variantId, type: "RETURN_IN", quantity: input.quantity, reason: payload.reason ?? "Customer exchange" },
      ] });
      const toPayload = (variant: typeof replacement, movementType: "SALE_OUT" | "RETURN_IN"): StockUpdatePayload => ({
        variantId: variant.id,
        productId: variant.productColor.product.id,
        productName: variant.productColor.product.name,
        colorName: variant.productColor.colorName,
        size: variant.size.size,
        stockQty: variant.stockQty,
        movementType,
        updatedAt: new Date(),
      });
      stockUpdates.push(toPayload(replacementAfter, "SALE_OUT"), toPayload(returnedVariant, "RETURN_IN"));
      itemCreates.push({
        originalSaleItem: { connect: { id: soldItem.id } },
        originalVariant: { connect: { id: soldItem.variantId } },
        replacementVariant: { connect: { id: replacement.id } },
        quantity: input.quantity,
        unitPriceDifference: difference,
      });
      processed.set(soldItem.id, consumed + input.quantity);
    }

    return tx.exchange.create({
      data: {
        sale: { connect: { id: sale.id } },
        processedBy: payload.processedById ? { connect: { id: payload.processedById } } : undefined,
        reason: payload.reason,
        items: { create: itemCreates },
      },
      include: { items: true, processedBy: { select: { id: true, name: true } } },
    });
  });
  stockUpdates.forEach(broadcastStockUpdate);
  return exchange;
};
