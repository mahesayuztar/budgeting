import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { profileService } from '@/src/lib/profile/ProfileService';
import { profileSchema } from '@/src/lib/profile/ProfileValidator';

/**
 * Memperbarui nama dan username pengguna yang sedang masuk.
 * @param {Request} request - Permintaan HTTP berisi data profil.
 * @returns {Promise<Response>} Data pengguna setelah diperbarui, atau respons error.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = profileSchema.parse(await request.json());

    return ok(await profileService.update(user.id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
