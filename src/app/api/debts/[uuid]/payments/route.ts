import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { debtService } from '@/src/lib/debts/DebtService';
import { debtPaymentSchema } from '@/src/lib/debts/DebtValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Mencatat satu pembayaran atas hutang atau piutang milik pengguna yang sedang
 * masuk, sekaligus transaksi otomatis dan pemutakhiran statusnya.
 * @param {Request} request - Permintaan HTTP berisi data pembayaran.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID catatan pada segmen dinamis.
 * @returns {Promise<Response>} Catatan setelah pembayaran masuk, atau respons error.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = debtPaymentSchema.parse(await request.json());

    return ok(await debtService.addPayment(user.id, uuid, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
