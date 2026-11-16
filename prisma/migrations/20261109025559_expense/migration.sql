-- CreateEnum
CREATE TYPE "ExpenseFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "ExpenseSchedule" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "frequency" "ExpenseFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dueDateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "daysOfMonth" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "monthOfYear" INTEGER,
    "expectedAmount" DECIMAL(12,2),
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSchedule_categoryId_key" ON "ExpenseSchedule"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseSchedule_isActive_startDate_idx" ON "ExpenseSchedule"("isActive", "startDate");

-- CreateIndex
CREATE INDEX "Expense_scheduleId_idx" ON "Expense"("scheduleId");

-- AddForeignKey
ALTER TABLE "ExpenseSchedule" ADD CONSTRAINT "ExpenseSchedule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExpenseSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
