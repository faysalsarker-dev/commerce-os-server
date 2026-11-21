import { AppError } from "../../errors/AppError";
import {
  Prisma,
  Shipment,
} from "../../generated/prisma/client";
import {
  CourierProvider,
  OrderStatus,
  ShipmentStatus,
} from "../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { decrypt } from "../../utils/crypto";
import {
  type DispatchShipmentInput,
  type PathaoCredentials,
  type SteadfastCredentials,
} from "./courier-integration.validation";
import * as PathaoProvider from "./providers/pathao";
import * as SteadfastProvider from "./providers/steadfast";

const orderForDispatchInclude = {
  customer: true,
  sale: { include: { items: true } },
} satisfies Prisma.OrderInclude;

const shipmentDetailInclude = {
  events: { orderBy: { occurredAt: "asc" } },
  courierAccount: {
    select: { id: true, label: true, provider: true },
  },
} satisfies Prisma.ShipmentInclude;

type DispatchOrder = Prisma.OrderGetPayload<{
  include: typeof orderForDispatchInclude;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPathaoCredentials = (
  value: unknown,
): value is PathaoCredentials =>
  isRecord(value) &&
  typeof value.clientId === "string" &&
  typeof value.clientSecret === "string" &&
  typeof value.username === "string" &&
  typeof value.password === "string";

const isSteadfastCredentials = (
  value: unknown,
): value is SteadfastCredentials =>
  isRecord(value) &&
  typeof value.apiKey === "string" &&
  typeof value.secretKey === "string";

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const asObject = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const providerResponseData = (value: unknown): Record<string, unknown> => {
  const response = asObject(value);
  const data = asObject(response.data);
  const nested = asObject(data.consignment ?? response.consignment);
  return Object.keys(nested).length
    ? nested
    : Object.keys(data).length
      ? data
      : response;
};

const getString = (
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
};

const getNumber = (
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
};

const dispatchRequest = (
  input: DispatchShipmentInput,
  order: DispatchOrder,
  codAmount: number,
  recipient: { name: string; phone: string; address: string },
): Record<string, string | number> => {
  const itemDescription =
    input.itemDescription ||
    order.sale.items
      .map((item) => `${item.productName} x${item.quantity}`)
      .join(", ");

  if (input.provider === CourierProvider.PATHAO) {
    const payload: Record<string, string | number> = {
      store_id: 0,
      merchant_order_id: order.sale.invoiceNo,
      recipient_name: recipient.name,
      recipient_phone: recipient.phone,
      recipient_address: recipient.address,
      recipient_city: input.recipientCity,
      recipient_zone: input.recipientZone,
      delivery_type: input.deliveryType,
      item_type: input.itemType,
      item_quantity: order.sale.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      item_weight: input.itemWeight,
      amount_to_collect: codAmount,
      item_description: itemDescription,
    };
    if (input.recipientArea !== undefined) {
      payload.recipient_area = input.recipientArea;
    }
    if (input.specialInstruction) {
      payload.special_instruction = input.specialInstruction;
    }
    return payload;
  }

  return {
    invoice: order.sale.invoiceNo,
    recipient_name: recipient.name,
    recipient_phone: recipient.phone,
    recipient_address: recipient.address,
    cod_amount: codAmount,
    item_description: itemDescription,
    ...(input.note ? { note: input.note } : {}),
  };
};

const getCredentialData = (account: {
  provider: CourierProvider;
  credentials: string;
}): PathaoCredentials | SteadfastCredentials => {
  const credentials = decrypt<unknown>(account.credentials);
  if (
    account.provider === CourierProvider.PATHAO &&
    isPathaoCredentials(credentials)
  ) {
    return credentials;
  }
  if (
    account.provider === CourierProvider.STEADFAST &&
    isSteadfastCredentials(credentials)
  ) {
    return credentials;
  }
  throw new AppError("Stored courier credentials are invalid.", 500);
};

export const dispatchCourierShipment = async (
  input: DispatchShipmentInput,
): Promise<Shipment> => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: orderForDispatchInclude,
  });
  if (!order) throw new AppError("Order not found.", 404);
  if (
    order.status === OrderStatus.DRAFT ||
    order.status === OrderStatus.CANCELLED ||
    order.status === OrderStatus.RETURNED ||
    order.status === OrderStatus.COMPLETED
  ) {
    throw new AppError(
      `Cannot dispatch a courier shipment for an order with status ${order.status}.`,
      409,
    );
  }
  if (
    order.sale.items.reduce((quantity, item) => quantity + item.quantity, 0) <= 0
  ) {
    throw new AppError("Cannot dispatch a shipment without sale items.", 400);
  }

  const account = await prisma.courierAccount.findFirst({
    where: {
      provider: input.provider,
      isActive: true,
      ...(input.courierAccountId
        ? { id: input.courierAccountId }
        : { isDefault: true }),
    },
  });
  if (!account) {
    throw new AppError(
      input.courierAccountId
        ? "Active courier account not found."
        : `No active default ${input.provider} account is configured.`,
      404,
    );
  }

  const recipient = {
    name: input.recipientName ?? order.customer.name,
    phone: input.recipientPhone ?? order.customer.phone ?? "",
    address: input.recipientAddress ?? order.sale.shippingAddress ?? "",
  };
  if (!recipient.phone.trim()) {
    throw new AppError("A recipient phone number is required.", 400);
  }
  if (!recipient.address.trim()) {
    throw new AppError(
      "A recipient address is required on the order or dispatch request.",
      400,
    );
  }

  const codAmount = input.codAmount ?? order.sale.dueAmount.toNumber();
  if (!Number.isInteger(codAmount)) {
    throw new AppError(
      "Courier COD amount must be a whole BDT amount. Provide codAmount explicitly if needed.",
      400,
    );
  }

  const providerPayload = dispatchRequest(input, order, codAmount, recipient);
  const credentials = getCredentialData(account);
  let sandbox = false;
  if (input.provider === CourierProvider.PATHAO) {
    const accountConfig = asObject(account.config);
    if (
      typeof accountConfig.sandbox !== "boolean" ||
      typeof accountConfig.storeId !== "number"
    ) {
      throw new AppError("Stored Pathao configuration is invalid.", 500);
    }
    if (!isPathaoCredentials(credentials)) {
      throw new AppError("Stored Pathao credentials are invalid.", 500);
    }
    providerPayload.store_id = accountConfig.storeId;
    sandbox = accountConfig.sandbox;
  } else if (!isSteadfastCredentials(credentials)) {
    throw new AppError("Stored Steadfast credentials are invalid.", 500);
  }

  let pendingShipment: Shipment;
  try {
    pendingShipment = await prisma.$transaction(
      async (transaction) => {
        const activeShipment = await transaction.shipment.findFirst({
          where: {
            orderId: order.id,
            status: {
              in: [
                ShipmentStatus.PENDING_DISPATCH,
                ShipmentStatus.CREATED,
                ShipmentStatus.PICKED_UP,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.PARTIAL_DELIVERED,
                ShipmentStatus.DELIVERED,
              ],
            },
          },
          select: { id: true },
        });
        if (activeShipment) {
          throw new AppError(
            "This order already has an active courier shipment.",
            409,
          );
        }

        const shipment = await transaction.shipment.create({
          data: {
            orderId: order.id,
            courierAccountId: account.id,
            provider: account.provider,
            status: ShipmentStatus.PENDING_DISPATCH,
            codAmount,
            attempts: 1,
            requestPayload: toJsonValue(providerPayload),
          },
        });
        await transaction.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            status: ShipmentStatus.PENDING_DISPATCH,
            rawStatus: "dispatch_requested",
            payload: toJsonValue(providerPayload),
          },
        });
        return shipment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AppError(
        "Another shipment dispatch is being processed for this order.",
        409,
      );
    }
    throw error;
  }

  let response: unknown;
  try {
    if (account.provider === CourierProvider.PATHAO) {
      if (!isPathaoCredentials(credentials)) {
        throw new AppError("Stored Pathao credentials are invalid.", 500);
      }
      response = await PathaoProvider.createShipment(
        credentials,
        sandbox,
        providerPayload,
      );
    } else {
      if (!isSteadfastCredentials(credentials)) {
        throw new AppError("Stored Steadfast credentials are invalid.", 500);
      }
      response = await SteadfastProvider.createShipment(
        credentials,
        providerPayload,
      );
    }
  } catch (error) {
    const isDefiniteRejection =
      error instanceof AppError &&
      error.statusCode >= 400 &&
      error.statusCode < 500;
    const failureStatus = isDefiniteRejection
      ? ShipmentStatus.DISPATCH_FAILED
      : ShipmentStatus.PENDING_DISPATCH;
    const message =
      error instanceof AppError
        ? error.message
        : "Courier shipment dispatch failed.";

    const confirmedByWebhook = await prisma.$transaction(async (transaction) => {
      const current = await transaction.shipment.findUniqueOrThrow({
        where: { id: pendingShipment.id },
        select: { status: true },
      });
      if (current.status !== ShipmentStatus.PENDING_DISPATCH) {
        return transaction.shipment.findUniqueOrThrow({
          where: { id: pendingShipment.id },
          include: shipmentDetailInclude,
        });
      }

      await transaction.shipment.update({
        where: { id: pendingShipment.id },
        data: { status: failureStatus, lastError: message },
      });
      await transaction.shipmentEvent.create({
        data: {
          shipmentId: pendingShipment.id,
          status: failureStatus,
          rawStatus: isDefiniteRejection
            ? "dispatch_failed"
            : "dispatch_outcome_unknown",
          payload: { error: message },
        },
      });
      return null;
    });
    if (confirmedByWebhook) return confirmedByWebhook;
    throw error;
  }

  const responseData = providerResponseData(response);
  const consignmentId = getString(responseData, "consignment_id", "cid");
  const trackingCode = getString(
    responseData,
    "tracking_code",
    "tracking_id",
    "tracking_number",
  );
  const deliveryCharge = getNumber(
    responseData,
    "delivery_fee",
    "delivery_charge",
  );

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.shipment.findUniqueOrThrow({
      where: { id: pendingShipment.id },
      select: { status: true },
    });
    const shipmentStatus =
      current.status === ShipmentStatus.PENDING_DISPATCH
        ? ShipmentStatus.CREATED
        : current.status;
    const shipment = await transaction.shipment.update({
      where: { id: pendingShipment.id },
      data: {
        status: shipmentStatus,
        ...(consignmentId ? { consignmentId } : {}),
        ...(trackingCode ? { trackingCode } : {}),
        ...(deliveryCharge !== undefined ? { deliveryCharge } : {}),
        responsePayload: toJsonValue(response ?? null),
        lastError: null,
      },
    });
    await transaction.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: shipmentStatus,
        rawStatus: "created",
        payload: toJsonValue(response ?? null),
      },
    });
    return transaction.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: shipmentDetailInclude,
    });
  });
};

export const getCourierShipmentById = async (id: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: shipmentDetailInclude,
  });
  if (!shipment) throw new AppError("Courier shipment not found.", 404);
  return shipment;
};
