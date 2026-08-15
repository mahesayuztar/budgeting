import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { profileService } from '@/src/lib/profile/ProfileService';
import { changePasswordSchema } from '@/src/lib/profile/ProfileValidator';

/**
 * Mengganti password pengguna yang sedang masuk dan mencabut sesi di perangkat
 * lainnya.
 * @param {Request} request - Permintaan HTTP berisi password lama dan password baru.
 * @returns {Promise<Response>} Penanda bahwa password sudah diganti, atau respons error.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = changePasswordSchema.parse(await request.json());
    await profileService.changePassword(user.id, input);

    return ok({ changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
