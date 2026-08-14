import { z } from "zod";
import { cursorParamsSchema } from "@/src/core/lib/pagination";

export const debtSchema = z.object({
  type: z.enum(["RECEIVABLE", "PAYABLE"], { error: "Tipe tidak valid." }),
  party: z.string().trim().min(1, "Nama pihak wajib diisi.").max(80),
  amount: z.coerce
    .number({ error: "Jumlah wajib diisi." })
    .positive("Jumlah harus lebih dari 0.")
    .max(999_999_999_999, "Jumlah terlalu besar."),
  note: z.string().trim().max(255).nullish(),
  dueDate: z.iso.date("Tanggal jatuh tempo tidak valid.").nullish(),
});

export type DebtInput = z.infer<typeof debtSchema>;

export const debtPaymentSchema = z.object({
  amount: z.coerce
    .number({ error: "Jumlah wajib diisi." })
    .positive("Jumlah harus lebih dari 0.")
    .max(999_999_999_999, "Jumlah terlalu besar."),
  paidAt: z.iso.date("Tanggal tidak valid."),
  note: z.string().trim().max(255).nullish(),
});

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;

export const debtListSchema = cursorParamsSchema.extend({
  type: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
  status: z.enum(["OPEN", "PAID"]).optional(),
});

export type DebtListParams = z.infer<typeof debtListSchema>;
