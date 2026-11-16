DO $$
BEGIN
  IF to_regtype('"CourierProvider"') IS NULL THEN
    CREATE TYPE "CourierProvider" AS ENUM ('PATHAO', 'STEADFAST');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"CourierAccount"') IS NULL THEN
    CREATE TABLE "CourierAccount" (
      "id" TEXT NOT NULL,
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
  ELSE
    ALTER TABLE "CourierAccount"
      DROP CONSTRAINT IF EXISTS "CourierAccount_shopId_provider_label_key";
    DROP INDEX IF EXISTS "CourierAccount_shopId_provider_label_key";
    DROP INDEX IF EXISTS "CourierAccount_shopId_isActive_idx";
    ALTER TABLE "CourierAccount" DROP COLUMN IF EXISTS "shopId";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CourierAccount_provider_label_key"
  ON "CourierAccount"("provider", "label");

CREATE INDEX IF NOT EXISTS "CourierAccount_provider_isActive_idx"
  ON "CourierAccount"("provider", "isActive");
