import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { transactionService } from '@/src/lib/transactions/TransactionService';
import { transactionListSchema, transactionSchema } from '@/src/lib/transactions/TransactionValidator';

/**
 * Mengambil satu halaman transaksi milik pengguna yang sedang masuk sesuai
 * filter periode, tipe, kata kunci, dan cursor pada query params.
 * @param {Request} request - Permintaan HTTP beserta query params penyaringnya.
 * @returns {Promise<Response>} Halaman transaksi beserta cursor berikutnya, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const params = transactionListSchema.parse(Object.fromEntries(searchParams));

    return ok(await transactionService.list(user.id, params));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Mencatat transaksi baru milik pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data transaksi.
 * @returns {Promise<Response>} Transaksi yang baru dibuat, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = transactionSchema.parse(await request.json());

    return ok(await transactionService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
