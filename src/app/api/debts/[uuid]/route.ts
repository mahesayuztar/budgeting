import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { debtService } from '@/src/lib/debts/DebtService';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Menghapus satu catatan hutang atau piutang milik pengguna yang sedang masuk.
 * @param {Request} _request - Permintaan HTTP, tidak dipakai karena tidak ada body.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID catatan pada segmen dinamis.
 * @returns {Promise<Response>} Penanda bahwa catatan sudah dihapus, atau respons error.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await debtService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
