import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { authService } from '@/src/lib/auth/AuthService';
import { registerSchema } from '@/src/lib/auth/RegisterValidator';

/**
 * Mendaftarkan pengguna baru beserta kategori dan akun bawaannya, lalu langsung
 * memasang cookie sesi.
 * @param {Request} request - Permintaan HTTP berisi data pendaftaran.
 * @returns {Promise<Response>} Data pengguna yang baru terdaftar, atau respons error.
 */
export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    return ok(await authService.register(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
