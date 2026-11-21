CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'WHATSAPP', 'GOOGLE', 'YOUTUBE', 'OTHER');

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "trackingCode" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Expense" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Sale"
    ADD COLUMN "campaignId" TEXT,
    ADD COLUMN "utmSource" TEXT,
    ADD COLUMN "utmMedium" TEXT,
    ADD COLUMN "utmCampaign" TEXT,
    ADD COLUMN "utmContent" TEXT,
    ADD COLUMN "utmTerm" TEXT;

CREATE UNIQUE INDEX "Campaign_trackingCode_key" ON "Campaign"("trackingCode");
CREATE INDEX "Campaign_platform_isActive_idx" ON "Campaign"("platform", "isActive");
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");
CREATE INDEX "Expense_campaignId_expenseDate_idx" ON "Expense"("campaignId", "expenseDate");
CREATE INDEX "Sale_campaignId_createdAt_idx" ON "Sale"("campaignId", "createdAt");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
