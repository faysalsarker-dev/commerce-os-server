import { createHash, createHmac, timingSafeEqual } from "crypto";
import { AppError } from "../../errors/AppError";
import { Prisma } from "../../generated/prisma/client";
import {
  CourierProvider,
  ShipmentStatus,
} from "../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { decrypt } from "../../utils/crypto";
import type { CourierWebhookInput } from "./courier-integration.validation";

type WebhookHeaders = {
  authorization?: string;
  "x-pathao-signature"?: string;
  "x-signature"?: string;
  "idempotency-key"?: string;
};

type WebhookResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: { success: boolean; message: string; duplicate?: boolean };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const safeEqual = (received: string, expected: string): boolean => {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
};

const getWebhookSecret = (encryptedSecret: string | null): string => {
  if (!encryptedSecret) {
    throw new AppError("Courier webhook secret is not configured.", 503);
  }
  const secret = decrypt<unknown>(encryptedSecret);
  if (!isRecord(secret) || typeof secret.secret !== "string") {
    throw new AppError("Stored courier webhook secret is invalid.", 500);
  }
  return secret.secret;
};

const response = (
  provider: CourierProvider,
  secret: string,
  duplicate = false,
): WebhookResponse => ({
  statusCode:
    provider === CourierProvider.PATHAO
      ? 202
      : 200,
  ...(provider === CourierProvider.PATHAO
    ? {
        headers: {
          "X-Pathao-Merchant-Webhook-Integration-Secret": secret,
        },
      }
    : {}),
  body: {
    success: true,
    message: duplicate
      ? "Courier webhook was already processed."
      : "Courier webhook received.",
    ...(duplicate ? { duplicate: true } : {}),
  },
});

const pickRecord = (payload: CourierWebhookInput): Record<string, unknown> => {
  const nested = payload.data;
  return isRecord(nested) ? { ...payload, ...nested } : payload;
};

const getString = (
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
};

const getNumber = (
  record: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return undefined;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const getEventKey = (
  provider: CourierProvider,
  accountId: string,
  headers: WebhookHeaders,
  rawBody: Buffer | undefined,
  payload: CourierWebhookInput,
): string => {
  const suppliedId = headers["idempotency-key"]?.trim();
  const body = rawBody?.toString("utf8") ?? JSON.stringify(payload);
  return createHash("sha256")
    .update(`${provider}:${accountId}:${suppliedId ?? body}`)
    .digest("hex");
};

const mapStatus = (
  rawStatus: string | undefined,
  event: string | undefined,
): ShipmentStatus | undefined => {
  const mapValue = (value: string | undefined): ShipmentStatus | undefined => {
    const normalized = (value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[.\s-]+/g, "_");
    switch (normalized) {
      case "order_created":
      case "created":
      case "pending":
      case "in_review":
      case "order_updated":
      case "pickup_requested":
      case "order_pickup_requested":
      case "assigned_for_pickup":
      case "order_assigned_for_pickup":
        return ShipmentStatus.CREATED;
      case "picked":
      case "picked_up":
      case "order_picked":
        return ShipmentStatus.PICKED_UP;
      case "at_the_sorting_hub":
      case "order_at_the_sorting_hub":
      case "in_transit":
      case "order_in_transit":
      case "received_at_last_mile_hub":
      case "order_received_at_last_mile_hub":
      case "assigned_for_delivery":
      case "order_assigned_for_delivery":
        return ShipmentStatus.IN_TRANSIT;
      case "delivered":
      case "order_delivered":
      case "delivered_approval_pending":
        return ShipmentStatus.DELIVERED;
      case "partial_delivery":
      case "partial_delivered":
      case "order_partial_delivery":
      case "partial_delivered_approval_pending":
        return ShipmentStatus.PARTIAL_DELIVERED;
      case "returned":
      case "return":
      case "order_returned":
      case "returned_to_merchant":
      case "order_returned_to_merchant":
      case "paid_return":
      case "order_paid_return":
        return ShipmentStatus.RETURNED;
      case "cancelled":
      case "canceled":
      case "pickup_cancelled":
      case "order_pickup_cancelled":
      case "cancelled_approval_pending":
        return ShipmentStatus.CANCELLED;
      case "pickup_failed":
      case "order_pickup_failed":
        return ShipmentStatus.DISPATCH_FAILED;
      default:
        return undefined;
    }
  };
  return mapValue(event) ?? mapValue(rawStatus);
};

const isTerminal = (status: ShipmentStatus): boolean =>
  status === ShipmentStatus.DELIVERED ||
  status === ShipmentStatus.PARTIAL_DELIVERED ||
  status === ShipmentStatus.RETURNED ||
  status === ShipmentStatus.CANCELLED;

const canAdvanceTo = (
  current: ShipmentStatus,
  next: ShipmentStatus,
): boolean => {
  if (current === next) return true;
  if (
    current === ShipmentStatus.RETURNED ||
    current === ShipmentStatus.CANCELLED
  ) {
    return false;
  }
  if (isTerminal(current) && next !== ShipmentStatus.RETURNED) {
    return false;
  }

  const rank: Record<ShipmentStatus, number> = {
    [ShipmentStatus.PENDING_DISPATCH]: 0,
    [ShipmentStatus.DISPATCH_FAILED]: 0,
    [ShipmentStatus.CREATED]: 1,
    [ShipmentStatus.PICKED_UP]: 2,
    [ShipmentStatus.IN_TRANSIT]: 3,
    [ShipmentStatus.PARTIAL_DELIVERED]: 4,
    [ShipmentStatus.DELIVERED]: 4,
    [ShipmentStatus.RETURNED]: 5,
    [ShipmentStatus.CANCELLED]: 5,
  };
  return rank[next] >= rank[current];
};

const parseOccurredAt = (value: string | undefined): Date => {
  if (!value) return new Date();
  const occurredAt = new Date(value);
  return Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
};

const verifyWebhook = (
  provider: CourierProvider,
  secret: string,
  headers: WebhookHeaders,
  rawBody: Buffer | undefined,
): void => {
  if (provider === CourierProvider.PATHAO) {
    if (!safeEqual(headers["x-pathao-signature"] ?? "", secret)) {
      throw new AppError("Invalid Pathao webhook signature.", 401);
    }
    return;
  }

  const bearer = headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer || !safeEqual(bearer, secret)) {
    throw new AppError("Invalid Steadfast webhook authorization.", 401);
  }
  const signature = headers["x-signature"]?.trim().toLowerCase() ?? "";
  if (!rawBody || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new AppError("Invalid Steadfast webhook signature.", 401);
  }
  const actual = Buffer.from(signature, "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new AppError("Invalid Steadfast webhook signature.", 401);
  }
};

export const receiveCourierWebhook = async (
  providerName: string,
  accountId: string,
  payload: CourierWebhookInput,
  headers: WebhookHeaders,
  rawBody?: Buffer,
): Promise<WebhookResponse> => {
  const upperProvider = providerName.toUpperCase();
  const provider =
    upperProvider === CourierProvider.PATHAO ||
    upperProvider === CourierProvider.STEADFAST
      ? upperProvider
      : undefined;
  if (!provider) {
    throw new AppError("Unsupported courier webhook provider.", 404);
  }

  const account = await prisma.courierAccount.findFirst({
    where: { id: accountId, provider },
    select: {
      id: true,
      provider: true,
      isActive: true,
      webhookSecret: true,
    },
  });
  if (!account || !account.isActive) {
    throw new AppError("Courier account not found.", 404);
  }

  const secret = getWebhookSecret(account.webhookSecret);
  verifyWebhook(account.provider, secret, headers, rawBody);

  const data = pickRecord(payload);
  const event = getString(data, "event", "notification_type");
  if (
    account.provider === CourierProvider.PATHAO &&
    event === "webhook_integration"
  ) {
    return response(account.provider, secret);
  }

  const consignmentId = getString(data, "consignment_id", "cid");
  const invoice = getString(data, "merchant_order_id", "invoice");
  const trackingCode = getString(
    data,
    "tracking_code",
    "tracking_number",
    "tracking_id",
  );
  const rawStatus =
    getString(
      data,
      "order_status_slug",
      "order_status",
      "delivery_status",
      "status",
    ) ??
    (event === "tracking_update"
      ? getString(data, "tracking_message")
      : undefined);
  const nextStatus = mapStatus(rawStatus, event);
  const eventKey = getEventKey(
    account.provider,
    account.id,
    headers,
    rawBody,
    payload,
  );

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.webhookLog.create({
        data: {
          provider: account.provider,
          accountId: account.id,
          eventKey,
          payload: toJsonValue(payload),
          valid: true,
        },
      });

      let shipment = consignmentId
        ? await transaction.shipment.findFirst({
            where: {
              provider: account.provider,
              courierAccountId: account.id,
              consignmentId,
            },
            include: { order: { include: { sale: true } } },
          })
        : null;

      if (
        shipment &&
        invoice &&
        shipment.order.sale.invoiceNo !== invoice
      ) {
        shipment = null;
      }

      if (!shipment && trackingCode) {
        const byTrackingCode = await transaction.shipment.findFirst({
          where: {
            provider: account.provider,
            courierAccountId: account.id,
            trackingCode,
          },
          include: { order: { include: { sale: true } } },
        });
        if (
          byTrackingCode &&
          (!invoice || byTrackingCode.order.sale.invoiceNo === invoice) &&
          (!consignmentId ||
            !byTrackingCode.consignmentId ||
            byTrackingCode.consignmentId === consignmentId)
        ) {
          shipment = byTrackingCode;
        }
      }

      if (!shipment && invoice) {
        const byInvoice = await transaction.shipment.findMany({
          where: {
            provider: account.provider,
            courierAccountId: account.id,
            order: { sale: { invoiceNo: invoice } },
          },
          orderBy: { createdAt: "desc" },
          include: { order: { include: { sale: true } } },
        });
        shipment =
          byInvoice.find(
            (candidate) =>
              !consignmentId ||
              !candidate.consignmentId ||
              candidate.consignmentId === consignmentId,
          ) ?? null;
      }

      if (!shipment) {
        await transaction.webhookLog.update({
          where: {
            provider_eventKey: {
              provider: account.provider,
              eventKey,
            },
          },
          data: {
            processed: true,
            error: "No matching shipment was found for this webhook.",
          },
        });
        return false;
      }

      const currentStatus = shipment.status;
      const shouldUpdateStatus =
        nextStatus !== undefined &&
        canAdvanceTo(currentStatus, nextStatus);
      const eventRawStatus = rawStatus ?? event;
      const occurredAt = parseOccurredAt(
        getString(data, "timestamp", "updated_at", "occurred_at"),
      );
      const deliveryCharge = getNumber(data, "delivery_fee", "delivery_charge");

      await transaction.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: nextStatus ?? currentStatus,
          rawStatus: eventRawStatus ?? "unknown",
          payload: toJsonValue(payload),
          occurredAt,
        },
      });
      await transaction.shipment.update({
        where: { id: shipment.id },
        data: {
          ...(shouldUpdateStatus && nextStatus ? { status: nextStatus } : {}),
          ...(shouldUpdateStatus ? { lastError: null } : {}),
          ...(eventRawStatus ? { courierStatus: eventRawStatus } : {}),
          ...(consignmentId && !shipment.consignmentId
            ? { consignmentId }
            : {}),
          ...(trackingCode ? { trackingCode } : {}),
          ...(deliveryCharge !== undefined ? { deliveryCharge } : {}),
        },
      });
      await transaction.webhookLog.update({
        where: {
          provider_eventKey: {
            provider: account.provider,
            eventKey,
          },
        },
        data: { processed: true },
      });
      return false;
    });

    return response(account.provider, secret);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.webhookLog.findUnique({
        where: {
          provider_eventKey: {
            provider: account.provider,
            eventKey,
          },
        },
        select: { id: true },
      });
      if (existing) return response(account.provider, secret, true);
    }
    throw error;
  }
};

export const getCourierWebhookLogs = async (accountId: string) => {
  const account = await prisma.courierAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  });
  if (!account) throw new AppError("Courier account not found.", 404);

  return prisma.webhookLog.findMany({
    where: { accountId },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
};
