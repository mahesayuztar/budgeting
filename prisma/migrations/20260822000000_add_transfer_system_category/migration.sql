-- Sediakan tepat satu kategori sistem bernama Transfer untuk setiap pengguna.
-- UUID dibentuk deterministik dari userId supaya skrip aman dijalankan ulang.
WITH users_without_transfer_category AS (
  SELECT
    u."id" AS "userId",
    md5('budgeting-transfer-category:' || u."id"::text) AS hash
  FROM "User" u
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Category" c
    WHERE c."userId" = u."id"
      AND c."name" = 'Transfer'
      AND c."type" = 'TRANSFER'
  )
)
INSERT INTO "Category" ("uuid", "userId", "name", "type", "icon", "color", "createdAt")
SELECT
  substr(hash, 1, 8) || '-' || substr(hash, 9, 4) || '-' || substr(hash, 13, 4) || '-' || substr(hash, 17, 4) || '-' || substr(hash, 21, 12),
  "userId",
  'Transfer',
  'TRANSFER',
  'ph:arrows-left-right',
  '#A3C7E8',
  CURRENT_TIMESTAMP
FROM users_without_transfer_category;

-- Normalisasi visual kategori sistem yang mungkin sudah ada.
UPDATE "Category"
SET
  "icon" = 'ph:arrows-left-right',
  "color" = '#A3C7E8'
WHERE "name" = 'Transfer'
  AND "type" = 'TRANSFER';

-- Hubungkan seluruh riwayat transfer ke kategori sistem milik user yang sama.
UPDATE "Transaction" transaction_row
SET "categoryId" = transfer_category."id"
FROM "Category" transfer_category
WHERE transaction_row."userId" = transfer_category."userId"
  AND transaction_row."type" = 'TRANSFER'
  AND transfer_category."name" = 'Transfer'
  AND transfer_category."type" = 'TRANSFER'
  AND transaction_row."categoryId" IS DISTINCT FROM transfer_category."id";
