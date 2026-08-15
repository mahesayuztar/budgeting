import { z } from 'zod';
import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { categoryService } from '@/src/lib/categories/CategoryService';
import { categorySchema } from '@/src/lib/categories/CategoryValidator';

const querySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
});

/**
 * Mengambil daftar kategori milik pengguna yang sedang masuk, dapat disaring
 * per tipe kategori.
 * @param {Request} request - Permintaan HTTP beserta query params penyaringnya.
 * @returns {Promise<Response>} Daftar kategori milik pengguna, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const { type } = querySchema.parse(Object.fromEntries(searchParams));

    return ok(await categoryService.list(user.id, type));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Membuat kategori baru milik pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data kategori.
 * @returns {Promise<Response>} Kategori yang baru dibuat, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = categorySchema.parse(await request.json());

    return ok(await categoryService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
