-- CreateEnum
CREATE TYPE "CourierProvider" AS ENUM ('PATHAO', 'STEADFAST');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING_DISPATCH', 'DISPATCH_FAILED', 'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'PARTIAL_DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CourierAccount" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "config" JSONB,
    "webhookSecret" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierAccountId" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "consignmentId" TEXT,
    "trackingCode" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING_DISPATCH',
    "courierStatus" TEXT,
    "codAmount" DECIMAL(12,2) NOT NULL,
    "deliveryCharge" DECIMAL(12,2),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "rawStatus" TEXT NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "accountId" TEXT,
    "eventKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierAccount_shopId_isActive_idx" ON "CourierAccount"("shopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourierAccount_shopId_provider_label_key" ON "CourierAccount"("shopId", "provider", "label");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_provider_consignmentId_key" ON "Shipment"("provider", "consignmentId");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_idx" ON "ShipmentEvent"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_provider_eventKey_key" ON "WebhookLog"("provider", "eventKey");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_courierAccountId_fkey" FOREIGN KEY ("courierAccountId") REFERENCES "CourierAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
