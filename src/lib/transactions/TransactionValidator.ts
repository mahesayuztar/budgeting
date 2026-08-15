import { z } from 'zod';
import { cursorParamsSchema } from '@/src/helpers/PaginationHelper';

export const transactionSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER'], { error: 'Tipe tidak valid.' }),
    amount: z.coerce.number({ error: 'Jumlah wajib diisi.' }).positive('Jumlah harus lebih dari 0.').max(999_999_999_999, 'Jumlah terlalu besar.'),
    categoryUuid: z.uuid('Kategori tidak valid.').nullish(),
    accountUuid: z.uuid('Akun tidak valid.'),
    toAccountUuid: z.uuid('Akun tujuan tidak valid.').nullish(),
    note: z.string().trim().max(255).nullish(),
    occurredAt: z.iso.date('Tanggal tidak valid.'),
  })
  .superRefine((_input, _context) => {
    if (_input.type !== 'TRANSFER') {
      return;
    }

    if (!_input.toAccountUuid) {
      _context.addIssue({
        code: 'custom',
        path: ['toAccountUuid'],
        message: 'Akun tujuan wajib diisi untuk transfer.',
      });
      return;
    }

    if (_input.toAccountUuid === _input.accountUuid) {
      _context.addIssue({
        code: 'custom',
        path: ['toAccountUuid'],
        message: 'Akun tujuan harus berbeda dari akun sumber.',
      });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionListSchema = cursorParamsSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
});

export type TransactionListParams = z.infer<typeof transactionListSchema>;
