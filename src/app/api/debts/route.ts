import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { debtService } from '@/src/lib/debts/DebtService';
import { debtListSchema, debtSchema } from '@/src/lib/debts/DebtValidator';

/**
 * Mengambil satu halaman hutang dan piutang milik pengguna yang sedang masuk
 * sesuai filter tipe, status, kata kunci, dan cursor pada query params.
 * @param {Request} request - Permintaan HTTP beserta query params penyaringnya.
 * @returns {Promise<Response>} Halaman catatan beserta cursor berikutnya, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const params = debtListSchema.parse(Object.fromEntries(searchParams));

    return ok(await debtService.list(user.id, params));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Mencatat hutang atau piutang baru milik pengguna yang sedang masuk, sekaligus
 * transaksi otomatisnya.
 * @param {Request} request - Permintaan HTTP berisi data hutang atau piutang.
 * @returns {Promise<Response>} Catatan yang baru dibuat, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = debtSchema.parse(await request.json());

    return ok(await debtService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
