ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

CREATE TYPE "ExchangeStatus" AS ENUM ('COMPLETED', 'CANCELLED');

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Exchange" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "ExchangeStatus" NOT NULL DEFAULT 'COMPLETED',
    "reason" TEXT,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExchangeItem" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "originalSaleItemId" TEXT NOT NULL,
    "originalVariantId" TEXT NOT NULL,
    "replacementVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceDifference" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "ExchangeItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text), "id", "status", "createdAt"
FROM "Order";

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_changedById_idx" ON "OrderStatusHistory"("changedById");
CREATE INDEX "Exchange_saleId_createdAt_idx" ON "Exchange"("saleId", "createdAt");
CREATE INDEX "Exchange_processedById_idx" ON "Exchange"("processedById");
CREATE INDEX "ExchangeItem_exchangeId_idx" ON "ExchangeItem"("exchangeId");
CREATE INDEX "ExchangeItem_originalSaleItemId_idx" ON "ExchangeItem"("originalSaleItemId");
CREATE INDEX "ExchangeItem_replacementVariantId_idx" ON "ExchangeItem"("replacementVariantId");

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExchangeItem" ADD CONSTRAINT "ExchangeItem_exchangeId_fkey"
    FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeItem" ADD CONSTRAINT "ExchangeItem_originalSaleItemId_fkey"
    FOREIGN KEY ("originalSaleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeItem" ADD CONSTRAINT "ExchangeItem_originalVariantId_fkey"
    FOREIGN KEY ("originalVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeItem" ADD CONSTRAINT "ExchangeItem_replacementVariantId_fkey"
    FOREIGN KEY ("replacementVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
