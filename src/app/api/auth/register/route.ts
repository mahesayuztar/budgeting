import { handleApiError, ok } from "@/src/core/lib/api-response";
import { authService } from "@/src/core/auth/services/auth.service";
import { registerSchema } from "@/src/core/auth/validators/register.validator";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const user = await authService.register(input);
    return ok(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
