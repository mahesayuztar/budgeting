import { AccountType } from "@prisma/client";
import { z } from "zod";

export const accountSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(AccountType),
    color: z.string().nullable(),
    bankName: z.string().trim().max(100).nullable(),
    accountNumber: z.string().trim().max(100).nullable(),
    openingBalance: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "BANK" && !data.bankName) {
      ctx.addIssue({
        code: "custom",
        path: ["bankName"],
        message: "Nama bank wajib diisi.",
      });
    }
  });

export type AccountInput = z.infer<typeof accountSchema>;