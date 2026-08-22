ALTER TABLE "DebtPayment"
ADD COLUMN "isOpeningBalance" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Transaction"
ADD COLUMN "debtPaymentId" INTEGER;

-- Tautkan pembayaran lama dengan transaksi otomatisnya. Arah transaksi
-- pembayaran selalu berlawanan dengan transaksi saat pokok hutang dicatat,
-- sehingga transaksi pokok tidak mungkin ikut terpilih.
WITH ranked_payments AS (
  SELECT
    payment."id",
    payment."debtId",
    payment."amount",
    payment."paidAt",
    debt."type" AS "debtType",
    row_number() OVER (
      PARTITION BY payment."debtId", payment."amount", payment."paidAt"
      ORDER BY payment."id"
    ) AS occurrence
  FROM "DebtPayment" payment
  JOIN "Debt" debt ON debt."id" = payment."debtId"
),
ranked_transactions AS (
  SELECT
    transaction_row."id",
    transaction_row."debtId",
    transaction_row."amount",
    transaction_row."occurredAt",
    row_number() OVER (
      PARTITION BY transaction_row."debtId", transaction_row."amount", transaction_row."occurredAt"
      ORDER BY transaction_row."id"
    ) AS occurrence
  FROM "Transaction" transaction_row
  JOIN "Debt" debt ON debt."id" = transaction_row."debtId"
  WHERE (debt."type" = 'PAYABLE' AND transaction_row."type" = 'EXPENSE')
     OR (debt."type" = 'RECEIVABLE' AND transaction_row."type" = 'INCOME')
)
UPDATE "Transaction" transaction_row
SET "debtPaymentId" = payment."id"
FROM ranked_payments payment
JOIN ranked_transactions matched_transaction
  ON matched_transaction."debtId" = payment."debtId"
 AND matched_transaction."amount" = payment."amount"
 AND matched_transaction."occurredAt" = payment."paidAt"
 AND matched_transaction.occurrence = payment.occurrence
WHERE transaction_row."id" = matched_transaction."id";

CREATE UNIQUE INDEX "Transaction_debtPaymentId_key"
ON "Transaction"("debtPaymentId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_debtPaymentId_fkey"
FOREIGN KEY ("debtPaymentId") REFERENCES "DebtPayment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
