-- CreateEnum
CREATE TYPE "SplitBillStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "SplitBillPriceMode" AS ENUM ('UNIT_PRICE', 'LINE_TOTAL');

-- CreateEnum
CREATE TYPE "SplitBillAdjustmentKind" AS ENUM ('DISCOUNT', 'TAX', 'SERVICE', 'ROUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "SplitBillAdjustmentCalculation" AS ENUM ('FIXED', 'PERCENT');

-- CreateEnum
CREATE TYPE "SplitBillAdjustmentBase" AS ENUM ('ITEMS_NET', 'RUNNING_TOTAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SplitBillAdjustmentEffect" AS ENUM ('ADD', 'SUBTRACT', 'INCLUDED');

-- CreateEnum
CREATE TYPE "SplitBillAdjustmentDistribution" AS ENUM ('PROPORTIONAL', 'EQUAL');

-- CreateTable
CREATE TABLE "SplitBill" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "merchantName" TEXT,
    "receiptNumber" TEXT,
    "occurredAt" DATE NOT NULL,
    "note" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "SplitBillStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedReceiptTotal" DECIMAL(18,2),
    "itemsSubtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustmentTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitBill_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SplitBill_version_check" CHECK ("version" > 0),
    CONSTRAINT "SplitBill_totals_check" CHECK (
      "itemsSubtotal" >= 0 AND
      "grandTotal" >= 0 AND
      ("expectedReceiptTotal" IS NULL OR "expectedReceiptTotal" >= 0)
    )
);

-- CreateTable
CREATE TABLE "SplitBillParticipant" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "splitBillId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isPayer" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "SplitBillParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SplitBillParticipant_sortOrder_check" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "SplitBillItem" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "splitBillId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceMode" "SplitBillPriceMode" NOT NULL DEFAULT 'UNIT_PRICE',
    "unitPrice" DECIMAL(18,2),
    "lineTotal" DECIMAL(18,2),
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "SplitBillItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SplitBillItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "SplitBillItem_sortOrder_check" CHECK ("sortOrder" >= 0),
    CONSTRAINT "SplitBillItem_amounts_check" CHECK (
      "discountAmount" >= 0 AND
      "grossAmount" >= 0 AND
      "netAmount" >= 0 AND
      "discountAmount" <= "grossAmount"
    ),
    CONSTRAINT "SplitBillItem_priceMode_check" CHECK (
      ("priceMode" = 'UNIT_PRICE' AND "unitPrice" IS NOT NULL AND "unitPrice" > 0 AND "lineTotal" IS NULL) OR
      ("priceMode" = 'LINE_TOTAL' AND "lineTotal" IS NOT NULL AND "lineTotal" > 0 AND "unitPrice" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "SplitBillItemAllocation" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SplitBillItemAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SplitBillItemAllocation_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "SplitBillItemAllocation_amount_check" CHECK ("amount" >= 0)
);

-- CreateTable
CREATE TABLE "SplitBillAdjustment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "splitBillId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SplitBillAdjustmentKind" NOT NULL,
    "calculation" "SplitBillAdjustmentCalculation" NOT NULL,
    "baseMode" "SplitBillAdjustmentBase" NOT NULL,
    "effect" "SplitBillAdjustmentEffect" NOT NULL,
    "distribution" "SplitBillAdjustmentDistribution" NOT NULL,
    "rate" DECIMAL(9,4),
    "baseAmount" DECIMAL(18,2),
    "amount" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "SplitBillAdjustment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SplitBillAdjustment_sortOrder_check" CHECK ("sortOrder" >= 0),
    CONSTRAINT "SplitBillAdjustment_values_check" CHECK (
      "amount" >= 0 AND
      ("rate" IS NULL OR "rate" > 0) AND
      ("baseAmount" IS NULL OR "baseAmount" >= 0)
    ),
    CONSTRAINT "SplitBillAdjustment_calculation_check" CHECK (
      ("calculation" = 'FIXED' AND "rate" IS NULL) OR
      ("calculation" = 'PERCENT' AND "rate" IS NOT NULL)
    ),
    CONSTRAINT "SplitBillAdjustment_base_check" CHECK (
      ("baseMode" = 'CUSTOM' AND "baseAmount" IS NOT NULL) OR
      ("baseMode" <> 'CUSTOM')
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "SplitBill_uuid_key" ON "SplitBill"("uuid");

-- CreateIndex
CREATE INDEX "SplitBill_userId_occurredAt_id_idx" ON "SplitBill"("userId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "SplitBill_userId_status_idx" ON "SplitBill"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SplitBillParticipant_uuid_key" ON "SplitBillParticipant"("uuid");

-- CreateIndex
CREATE INDEX "SplitBillParticipant_splitBillId_sortOrder_idx" ON "SplitBillParticipant"("splitBillId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SplitBillItem_uuid_key" ON "SplitBillItem"("uuid");

-- CreateIndex
CREATE INDEX "SplitBillItem_splitBillId_sortOrder_idx" ON "SplitBillItem"("splitBillId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SplitBillItemAllocation_itemId_participantId_key" ON "SplitBillItemAllocation"("itemId", "participantId");

-- CreateIndex
CREATE INDEX "SplitBillItemAllocation_participantId_idx" ON "SplitBillItemAllocation"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitBillAdjustment_uuid_key" ON "SplitBillAdjustment"("uuid");

-- CreateIndex
CREATE INDEX "SplitBillAdjustment_splitBillId_sortOrder_idx" ON "SplitBillAdjustment"("splitBillId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SplitBill" ADD CONSTRAINT "SplitBill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitBillParticipant" ADD CONSTRAINT "SplitBillParticipant_splitBillId_fkey" FOREIGN KEY ("splitBillId") REFERENCES "SplitBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitBillItem" ADD CONSTRAINT "SplitBillItem_splitBillId_fkey" FOREIGN KEY ("splitBillId") REFERENCES "SplitBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitBillItemAllocation" ADD CONSTRAINT "SplitBillItemAllocation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "SplitBillItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitBillItemAllocation" ADD CONSTRAINT "SplitBillItemAllocation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SplitBillParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitBillAdjustment" ADD CONSTRAINT "SplitBillAdjustment_splitBillId_fkey" FOREIGN KEY ("splitBillId") REFERENCES "SplitBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
