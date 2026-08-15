import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { authService } from '@/src/lib/auth/AuthService';

/**
 * Mengakhiri sesi pengguna yang sedang berjalan dan melepas cookie sesinya.
 * @returns {Promise<Response>} Penanda bahwa sesi sudah diakhiri, atau respons error.
 */
export async function POST() {
  try {
    await authService.logout();
    return ok({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
