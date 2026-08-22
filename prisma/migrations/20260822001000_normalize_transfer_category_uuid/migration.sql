-- UUID hasil backfill harus lolos validator UUID API. Bentuk ini mengikuti
-- susunan UUID v5 (version nibble 5 dan RFC variant nibble 8), tetapi tetap
-- deterministik per user sehingga migrasi aman dijalankan ulang.
WITH transfer_category_hashes AS (
  SELECT
    c."id",
    md5('budgeting-transfer-category:' || c."userId"::text) AS hash
  FROM "Category" c
  WHERE c."name" = 'Transfer'
    AND c."type" = 'TRANSFER'
)
UPDATE "Category" transfer_category
SET "uuid" =
  substr(transfer_category_hashes.hash, 1, 8) || '-' ||
  substr(transfer_category_hashes.hash, 9, 4) || '-5' ||
  substr(transfer_category_hashes.hash, 14, 3) || '-8' ||
  substr(transfer_category_hashes.hash, 18, 3) || '-' ||
  substr(transfer_category_hashes.hash, 21, 12)
FROM transfer_category_hashes
WHERE transfer_category."id" = transfer_category_hashes."id";
