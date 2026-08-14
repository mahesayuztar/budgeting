import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { error: "Tipe tidak valid." }),
  amount: z.coerce
    .number({ error: "Jumlah wajib diisi." })
    .positive("Jumlah harus lebih dari 0.")
    .max(999_999_999_999, "Jumlah terlalu besar."),
  categoryUuid: z.uuid("Kategori tidak valid.").nullish(),
  note: z.string().trim().max(255).nullish(),
  occurredAt: z.iso.date("Tanggal tidak valid."),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionListSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type TransactionListParams = z.infer<typeof transactionListSchema>;
