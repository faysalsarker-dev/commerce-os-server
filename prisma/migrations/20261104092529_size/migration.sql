/*
  Warnings:

  - You are about to drop the column `size` on the `ProductVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productColorId,sizeId]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sizeId` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductVariant_productColorId_size_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isWebsiteVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "size",
ADD COLUMN     "sizeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Size" (
    "id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Size_size_key" ON "Size"("size");

-- CreateIndex
CREATE INDEX "Product_isWebsiteVisible_idx" ON "Product"("isWebsiteVisible");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productColorId_sizeId_key" ON "ProductVariant"("productColorId", "sizeId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
