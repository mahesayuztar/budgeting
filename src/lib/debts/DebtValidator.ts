import { z } from 'zod';
import { cursorParamsSchema } from '@/src/helpers/PaginationHelper';

export const debtSchema = z
  .object({
    type: z.enum(['RECEIVABLE', 'PAYABLE'], { error: 'Tipe tidak valid.' }),
    party: z.string().trim().min(1, 'Nama pihak wajib diisi.').max(80),
    amount: z.coerce.number({ error: 'Jumlah wajib diisi.' }).positive('Jumlah harus lebih dari 0.').max(999_999_999_999, 'Jumlah terlalu besar.'),
    initialPaidAmount: z.coerce.number({ error: 'Saldo awal pembayaran tidak valid.' }).min(0, 'Saldo awal pembayaran tidak boleh negatif.').default(0),
    accountUuid: z.uuid('Akun awal tidak valid.'),
    note: z.string().trim().max(255).nullish(),
    date: z.iso.date('Tanggal tidak valid.'),
    dueDate: z.iso.date('Tanggal jatuh tempo tidak valid.').nullish(),
  })
  .superRefine((_input, _context) => {
    if (_input.initialPaidAmount > _input.amount) {
      _context.addIssue({
        code: 'custom',
        path: ['initialPaidAmount'],
        message: 'Saldo awal pembayaran tidak boleh melebihi nilai hutang/piutang.',
      });
    }
  });

export type DebtInput = z.infer<typeof debtSchema>;

export const debtPaymentSchema = z.object({
  amount: z.coerce.number({ error: 'Jumlah wajib diisi.' }).positive('Jumlah harus lebih dari 0.').max(999_999_999_999, 'Jumlah terlalu besar.'),
  paidAt: z.iso.date('Tanggal tidak valid.'),
  accountUuid: z.uuid('Akun pembayaran tidak valid.'),
  note: z.string().trim().max(255).nullish(),
});

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;

export const debtPaymentUpdateSchema = debtPaymentSchema.partial({ accountUuid: true });

export type DebtPaymentUpdateInput = z.infer<typeof debtPaymentUpdateSchema>;

export const debtListSchema = cursorParamsSchema.extend({
  type: z.enum(['RECEIVABLE', 'PAYABLE']).optional(),
  status: z.enum(['OPEN', 'PAID']).optional(),
});

export type DebtListParams = z.infer<typeof debtListSchema>;
