import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { authService } from '@/src/lib/auth/AuthService';
import { loginSchema } from '@/src/lib/auth/LoginValidator';

/**
 * Memproses permintaan masuk dan memasang cookie sesi bila kredensialnya benar.
 * @param {Request} request - Permintaan HTTP berisi email dan password.
 * @returns {Promise<Response>} Data pengguna yang berhasil masuk, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    return ok(await authService.login(input));
  } catch (error) {
    return handleApiError(error);
  }
}
