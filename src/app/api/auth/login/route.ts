import { handleApiError, ok } from "@/src/core/lib/api-response";
import { authService } from "@/src/core/auth/services/auth.service";
import { loginSchema } from "@/src/core/auth/validators/login.validator";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await authService.login(input);
    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}
