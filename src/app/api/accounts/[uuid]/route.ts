import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { accountService } from '@/src/lib/accounts/AccountService';
import { accountSchema } from '@/src/lib/accounts/AccountValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Memperbarui satu akun milik pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data akun.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID akun pada segmen dinamis.
 * @returns {Promise<Response>} Akun setelah diperbarui, atau respons error.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = accountSchema.parse(await request.json());

    return ok(await accountService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Menonaktifkan satu akun milik pengguna yang sedang masuk.
 * @param {Request} _request - Permintaan HTTP, tidak dipakai karena tidak ada body.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID akun pada segmen dinamis.
 * @returns {Promise<Response>} Penanda bahwa akun sudah dinonaktifkan, atau respons error.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await accountService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
