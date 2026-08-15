import { z } from 'zod';
import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { accountService } from '@/src/lib/accounts/AccountService';
import { accountSchema } from '@/src/lib/accounts/AccountValidator';

const querySchema = z.object({
  type: z.enum(['CASH', 'BANK']).optional(),
});

/**
 * Mengambil daftar akun aktif milik pengguna yang sedang masuk, dapat disaring
 * per jenis akun.
 * @param {Request} request - Permintaan HTTP beserta query params penyaringnya.
 * @returns {Promise<Response>} Daftar akun milik pengguna, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const { type } = querySchema.parse(Object.fromEntries(searchParams));

    return ok(await accountService.list(user.id, type));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Membuat akun baru milik pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data akun.
 * @returns {Promise<Response>} Akun yang baru dibuat, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = accountSchema.parse(await request.json());

    return ok(await accountService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
