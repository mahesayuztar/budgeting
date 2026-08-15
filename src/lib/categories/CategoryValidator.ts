import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(50),
  type: z.enum(['INCOME', 'EXPENSE'], { error: 'Tipe tidak valid.' }),
  icon: z.string().trim().max(60).nullish(),
  color: z.string().trim().max(20).nullish(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
