import { AccountType } from '@prisma/client';
import { z } from 'zod';

export const accountSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(AccountType),
    color: z.string().nullable(),
    bankName: z.string().trim().max(100).nullable(),
    accountNumber: z.string().trim().max(100).nullable(),
    openingBalance: z.string().regex(/^-?\d+(?:\.\d{0,2})?$/, 'Saldo awal tidak valid.'),
  })
  .superRefine((_input, _context) => {
    if (_input.type === 'BANK' && !_input.bankName) {
      _context.addIssue({
        code: 'custom',
        path: ['bankName'],
        message: 'Nama bank wajib diisi.',
      });
    }
  });

export type AccountInput = z.infer<typeof accountSchema>;
