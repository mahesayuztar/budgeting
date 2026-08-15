import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { categoryService } from '@/src/lib/categories/CategoryService';
import { categorySchema } from '@/src/lib/categories/CategoryValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Memperbarui satu kategori milik pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data kategori.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID kategori pada segmen dinamis.
 * @returns {Promise<Response>} Kategori setelah diperbarui, atau respons error.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = categorySchema.parse(await request.json());

    return ok(await categoryService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Menghapus satu kategori milik pengguna yang sedang masuk.
 * @param {Request} _request - Permintaan HTTP, tidak dipakai karena tidak ada body.
 * @param {RouteContext} context - Konteks route Next.js.
 * @param {Promise<{ uuid: string }>} context.params - UUID kategori pada segmen dinamis.
 * @returns {Promise<Response>} Penanda bahwa kategori sudah dihapus, atau respons error.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await categoryService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
