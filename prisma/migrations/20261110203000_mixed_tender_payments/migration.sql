ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MIX';

CREATE TABLE "RefundPayment" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundPayment_refundId_idx" ON "RefundPayment"("refundId");
CREATE INDEX "RefundPayment_method_idx" ON "RefundPayment"("method");

ALTER TABLE "RefundPayment"
ADD CONSTRAINT "RefundPayment_refundId_fkey"
FOREIGN KEY ("refundId") REFERENCES "Refund"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RefundPayment" ("id", "refundId", "method", "amount")
SELECT 'legacy-refund-payment-' || "id", "id", "method", "amount"
FROM "Refund";
