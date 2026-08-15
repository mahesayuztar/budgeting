import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { transactionService } from '@/src/lib/transactions/TransactionService';
import { transactionSchema } from '@/src/lib/transactions/TransactionValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Memperbarui satu transaksi milik pengguna yang sedang masuk. Sejak Next 16,
 * `params` diterima sebagai Promise sehingga perlu di-await lebih dulu.
 * @param {Request} request - Permintaan HTTP berisi data transaksi.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID transaksi pada segmen dinamis.
 * @returns {Promise<Response>} Transaksi setelah diperbarui, atau respons error.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = transactionSchema.parse(await request.json());

    return ok(await transactionService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Menghapus satu transaksi milik pengguna yang sedang masuk.
 * @param {Request} _request - Permintaan HTTP, tidak dipakai karena tidak ada body.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID transaksi pada segmen dinamis.
 * @returns {Promise<Response>} Penanda bahwa transaksi sudah dihapus, atau respons error.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await transactionService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
