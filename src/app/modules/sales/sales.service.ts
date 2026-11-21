import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { $Enums, Prisma } from "../../generated/prisma/client";
import { broadcastStockUpdate, type StockUpdatePayload } from "../../config/socket";

const variantInclude = {
  size: true,
  productColor: {
    include: {
      product: true,
    },
  },
};

const stockMovementInclude = {
  variant: {
    include: {
      size: true,
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
      OR: [{ sku: code }, { qrCode: code }],
    },
    include: variantInclude,
  });

  if (!variant) {
    throw new AppError("VARIANT_NOT_FOUND", 404);
  }

  const product = variant.productColor?.product;

  if (!product) {
    throw new AppError("VARIANT_DATA_CORRUPT", 500);
  }

  const sellingPriceOverride = variant.sellingPriceOverride
    ? Number(variant.sellingPriceOverride)
    : null;
  const sellingPrice = sellingPriceOverride ?? Number(product.sellingPrice);

  return {
    variantId: variant.id,
    sku: variant.sku,
    size: variant.size.size,
    productName: product.name,
    colorName: variant.productColor.colorName,
    colorHex: variant.productColor.colorHex,
    thumbnailUrl: variant.productColor.images[0] ?? null,
    sellingPrice,
    isOverridden: sellingPriceOverride !== null,
    stockQty: variant.stockQty,
    inStock: variant.stockQty > 0,
  };
};




const generateInvoiceNo = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const timeSuffix = Date.now().toString().slice(-4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${timeSuffix}${randomSuffix}`;
};




interface CheckoutItemInput {
  variantId: string;
  quantity: number;
  discount?: number; // per-line discount in taka, optional
}

interface InvoiceReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

interface InvoiceReceiptCustomer {
  id: string;
  name: string;
  phone: string | null;
}

// This is the shape the frontend prints — flat, pre-computed, no Prisma noise.
interface InvoiceReceipt {
  invoiceNo: string;
  saleId: string;
  date: string; // ISO string, format on the frontend for locale
  channel: $Enums.SaleChannel;
  status: $Enums.SaleStatus;

  soldBy: { id: string; name: string } | null;
  customer: InvoiceReceiptCustomer | null; // null for guest/walk-in sales — frontend should handle this, e.g. print "Walk-in Customer"

  items: InvoiceReceiptItem[];

  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;

  paidAmount: number;
  dueAmount: number;
  paymentStatus: $Enums.PaymentStatus;
  paymentMethod: $Enums.PaymentMethod | null; // null if paidAmount was 0 (fully due, nothing collected yet)
  payments: Array<{
    method: $Enums.PaymentMethod;
    amount: number;
    reference: string | null;
  }>;
  dueDate: string | null;

  notes: string | null;
}

export interface CheckoutSalePayload {
  customerId?: string;           // frontend passes this if an existing customer was selected
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  items: CheckoutItemInput[];
  discount?: number;             // order-level manual discount, e.g. 20 (taka) off a 200 total
  shippingFee?: number;
  isFullPayment?: boolean;
  paidAmount?: number;           // only read when isFullPayment === false
  payments?: Array<{
    method: $Enums.PaymentMethod;
    amount: number;
    reference?: string;
  }>;
  dueDate?: string;              // ISO date string, only relevant when there's a due
  paymentMethod?: $Enums.PaymentMethod;
 soldById:string ;           // REQUIRED — comes from the logged-in staff session, never guessed
  channel?: $Enums.SaleChannel;
  notes?: string;
  invoiceNo?: string;
  shippingAddress?: string;
  reference?: string;
}

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

 
export const checkoutSale = async (payload: CheckoutSalePayload) => {
  const manualDiscount = payload.discount ?? 0;
  const shippingFee = payload.shippingFee ?? 0;
  const isFullPayment = payload.isFullPayment ?? true;
  const paymentMethod = mapPaymentMethod(payload.paymentMethod);

  if (paymentMethod === $Enums.PaymentMethod.MIX && !payload.payments) {
    throw new AppError(
      "MIX payment method requires individual payment entries.",
      400,
    );
  }
 
  // ---- STEP 0: soldById is mandatory, never fall back to "some random active user" ----
  if (!payload.soldById?.trim()) {
    throw new AppError("No staff user provided for this sale.", 400);
  }
  const soldByUser = await prisma.user.findUnique({ where: { id: payload.soldById } });
  if (!soldByUser) {
    throw new AppError("Invalid staff user for this sale.", 400);
  }
 
  // ---- STEP 0.5: reject junk line items before opening a transaction at all ----
  if (!payload.items?.length) {
    throw new AppError("At least one item is required to complete a sale.", 400);
  }
  for (const item of payload.items) {
    if (!item.variantId || item.quantity <= 0) {
      throw new AppError("Every item must have a valid variantId and a quantity greater than 0.", 400);
    }
  }
 
  const transactionResult = await prisma.$transaction(
    async (tx) => {
    // ---- STEP 1: does the customer exist? (frontend passes customerId directly, no guessing here) ----
    let customer: Prisma.CustomerGetPayload<Record<string, never>> | null = null;
    if (payload.customerId?.trim()) {
      customer = await tx.customer.findUnique({ where: { id: payload.customerId } });
      if (!customer) {
        throw new AppError("Selected customer does not exist.", 404);
      }
    }

    let campaignId = payload.campaignId?.trim() || null;
    if (campaignId) {
      const campaign = await tx.campaign.findFirst({
        where: { id: campaignId, isActive: true },
        select: { id: true },
      });
      if (!campaign) throw new AppError("Selected campaign does not exist or is inactive.", 404);
    } else if (payload.utmCampaign?.trim()) {
      const campaign = await tx.campaign.findFirst({
        where: { trackingCode: payload.utmCampaign.trim(), isActive: true },
        select: { id: true },
      });
      campaignId = campaign?.id ?? null;
    }
 
    // ---- STEP 2: resolve every variant's real price + validate stock, ATOMICALLY per item ----
    // Fetch all variants in parallel first (pure read, safe to parallelize)
    const variants = await Promise.all(
      payload.items.map((item) =>
        tx.productVariant.findUnique({ where: { id: item.variantId }, include: variantInclude }),
      ),
    );
 
    const preparedSaleItems: Prisma.SaleItemCreateWithoutSaleInput[] = [];
    const lineResults: Array<{
      variantId: string;
      productName?: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
    }> = [];
    const stockUpdates: StockUpdatePayload[] = [];
    const movementsToCreate: Prisma.StockMovementCreateManyInput[] = [];
 
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      const variant = variants[i];
 
      if (!variant) {
        throw new AppError(`Variant with ID ${item.variantId} not found`, 404);
      }
 
      // Snapshot price from DB, never trust a price from the frontend
      const unitPrice = Number(
        variant.sellingPriceOverride ?? variant.productColor?.product?.sellingPrice ?? 0,
      );
      const itemDiscount = item.discount ?? 0;
      const lineSubtotal = Math.max(0, unitPrice * item.quantity - itemDiscount);
 
      // ATOMIC stock check + decrement in one DB call — the `gte` guard is evaluated
      // by Postgres at write time, so two simultaneous checkouts can't both pass a
      // stale in-memory check the way the old code did.
      const stockResult = await tx.productVariant.updateMany({
        where: { id: item.variantId, stockQty: { gte: item.quantity } },
        data: { stockQty: { decrement: item.quantity } },
      });
 
      if (stockResult.count === 0) {
        throw new AppError(
          `Insufficient stock for ${variant.productColor?.product?.name ?? "Product"} (${variant.size.size}). It may have just sold out.`,
          400,
        );
      }
 
      // Queue the movement instead of writing it now — one batched createMany after
      // the loop instead of N separate round-trips.
      movementsToCreate.push({
        variantId: item.variantId,
        type: $Enums.StockMovementType.SALE_OUT,
        quantity: item.quantity,
        reason: "Sale checkout",
      });
 
      const fullProductName = [
        variant.productColor?.product?.name,
        variant.productColor?.colorName,
        variant.size.size,
      ]
        .filter(Boolean)
        .join(" - ");
 
      preparedSaleItems.push({
        variant: { connect: { id: item.variantId } },
        productName: fullProductName || "Product Item",
        sku: variant.sku,
        unitPrice,
        quantity: item.quantity,
        discount: itemDiscount,
        subtotal: lineSubtotal,
      });
 
      lineResults.push({
        variantId: item.variantId,
        productName: variant.productColor?.product?.name,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        total: lineSubtotal,
      });
 
      // Computed locally instead of re-querying — this is only used for the live
      // broadcast/UI hint, not as a source of truth (StockMovement + the DB row
      // remain the real source of truth regardless of what this number says).
      const priorStockUpdate = stockUpdates.find((update) => update.variantId === item.variantId);
      if (priorStockUpdate) {
        priorStockUpdate.stockQty = Math.max(0, priorStockUpdate.stockQty - item.quantity);
      } else {
        stockUpdates.push({
          variantId: item.variantId,
          productId: variant.productColor?.product?.id,
          productName: variant.productColor?.product?.name,
          colorName: variant.productColor?.colorName,
          size: variant.size.size,
          stockQty: Math.max(0, variant.stockQty - item.quantity),
          movementType: "SALE_OUT",
          updatedAt: new Date(),
        });
      }
    }
 
    // One batched insert instead of one-per-item — cuts N round-trips down to 1.
    if (movementsToCreate.length > 0) {
      await tx.stockMovement.createMany({ data: movementsToCreate });
    }
 
    // ---- STEP 3: totals — discount comes straight from payload, as you described ----
    const subtotal = lineResults.reduce((sum, item) => sum + item.total, 0);
    const grandTotal = Math.max(0, subtotal - manualDiscount + shippingFee);
 
    // ---- STEP 4: full pay vs. due — dueAmount is ALWAYS server-derived, never trusted from payload ----
    let paidAmount = grandTotal;
    let dueAmount = 0;
 
    if (payload.payments) {
      const paidCents = payload.payments.reduce(
        (sum, payment) => sum + Math.round(payment.amount * 100),
        0,
      );
      const totalCents = Math.round(grandTotal * 100);

      if (paidCents > totalCents) {
        throw new AppError("Payment amounts cannot exceed the sale total.", 400);
      }

      if (isFullPayment && paidCents !== totalCents) {
        throw new AppError(
          "Payment amounts must equal the sale total for a full payment.",
          400,
        );
      }

      if (
        payload.paidAmount !== undefined &&
        Math.round(payload.paidAmount * 100) !== paidCents
      ) {
        throw new AppError(
          "paidAmount must match the sum of payment entries.",
          400,
        );
      }

      paidAmount = paidCents / 100;
      dueAmount = (totalCents - paidCents) / 100;
    } else if (!isFullPayment) {
      paidAmount = Math.min(payload.paidAmount ?? 0, grandTotal); // can't "pay" more than the total
      dueAmount = Math.max(0, grandTotal - paidAmount);
    }
 
    // A sale left with a due balance needs someone to chase — enforce it here.
    if (dueAmount > 0 && !customer) {
      throw new AppError("A customer must be selected for sales with a due balance.", 400);
    }
 
    let paymentStatus: $Enums.PaymentStatus = $Enums.PaymentStatus.UNPAID;
    if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = $Enums.PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = $Enums.PaymentStatus.PARTIAL;
    }
 
    // ---- STEP 5: invoice number + notes (due date folded into notes for now — see note below) ----
    const invoiceNo = payload.invoiceNo?.trim() || generateInvoiceNo();
 
    let combinedNotes = payload.notes?.trim() ?? "";
    if (dueAmount > 0 && payload.dueDate?.trim()) {
      const dueNote = `Due Date: ${payload.dueDate.trim()}`;
      combinedNotes = combinedNotes ? `${combinedNotes} | ${dueNote}` : dueNote;
    }
 
    // ---- STEP 6: create the Sale + SaleItems ----
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: customer?.id ?? null,
        campaignId,
        utmSource: payload.utmSource?.trim() || null,
        utmMedium: payload.utmMedium?.trim() || null,
        utmCampaign: payload.utmCampaign?.trim() || null,
        utmContent: payload.utmContent?.trim() || null,
        utmTerm: payload.utmTerm?.trim() || null,
        soldById: payload.soldById,
        channel: payload.channel ?? $Enums.SaleChannel.OFFLINE,
        status: $Enums.SaleStatus.COMPLETED,
        subtotal,
        discount: manualDiscount,
        shippingFee,
        total: grandTotal,
        paidAmount,
        dueAmount,
        paymentStatus,
        shippingAddress: payload.shippingAddress ?? null,
        notes: combinedNotes || null,
        items: { create: preparedSaleItems },
      },
      include: {
        items: true,
        customer: true,
        soldBy: { select: { id: true, name: true, email: true } },
      },
    });
 
    // ---- STEP 7: append each tender to the payment ledger ----
    let payments: Array<{
      method: $Enums.PaymentMethod;
      amount: number;
      reference: string | null;
    }> = [];
    if (paidAmount > 0) {
      payments = payload.payments
        ? payload.payments.map((payment) => ({
            method: payment.method,
            amount: Math.round(payment.amount * 100) / 100,
            reference: payment.reference ?? null,
          }))
        : [
            {
              method: paymentMethod,
              amount: paidAmount,
              reference: payload.reference ?? null,
            },
          ];

      await tx.payment.createMany({
        data: payments.map((payment) => ({
          saleId: sale.id,
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
          receivedById: payload.soldById,
          notes: combinedNotes || null,
        })),
      });
    }
 
    // ---- STEP 8: if a customer exists, update their cached stats — inside this SAME transaction ----
    if (customer) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: grandTotal },
          totalDue: { increment: dueAmount },
          lastPurchaseAt: new Date(),
        },
      });
    }
 
    return { sale, payments, customer, results: lineResults, stockUpdates };
    },
    { timeout: 15000, maxWait: 8000 }, // default 5000ms was too tight for multi-item carts on a remote DB
  );
 
  // Side effects OUTSIDE the transaction — fire only after commit succeeds
  for (const update of transactionResult.stockUpdates) {
    broadcastStockUpdate(update);
  }
 
  const { sale, payments, customer } = transactionResult;
 
  // ---- Build the flat receipt shape the frontend actually prints ----
  const invoice: InvoiceReceipt = {
    invoiceNo: sale.invoiceNo,
    saleId: sale.id,
    date: sale.createdAt.toISOString(),
    channel: sale.channel,
    status: sale.status,
 
    soldBy: sale.soldBy
      ? { id: sale.soldBy.id, name: sale.soldBy.name }
      : null,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
 
    items: sale.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      subtotal: Number(item.subtotal),
    })),
 
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    shippingFee: Number(sale.shippingFee),
    total: Number(sale.total),
 
    paidAmount: Number(sale.paidAmount),
    dueAmount: Number(sale.dueAmount),
    paymentStatus: sale.paymentStatus,
    paymentMethod:
      payments.length === 0
        ? null
        : new Set(payments.map((payment) => payment.method)).size > 1
          ? $Enums.PaymentMethod.MIX
          : payments[0].method,
    payments,
    dueDate: payload.dueDate ?? null, // still notes-derived for now — becomes sale.dueDate once that field is added
 
    notes: sale.notes,
  };
 
  return { invoice };
};
 


export const getSalesHistory = async () => {
  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      soldBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          variant: {
            include: variantInclude,
          },
        },
      },
      payments: true,
      refunds: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sales;
};


export const getSaleByInvoiceNumber = async (invoiceNo: string) => {
  const sale = await prisma.sale.findUnique({
    where: {
      invoiceNo,
    },
    include: {
      items: {
        include: {
          variant: {
            include: variantInclude,
          },
        },
      },
      soldBy: {
        select: {
          name: true,
          email: true,
        },
      },
      payments: true,
    },
  });

  if (!sale) {
    throw new AppError("Sale not found", 404);
  }

  return sale;
};
