import { handleApiError, ok } from "@/src/core/lib/api-response";
import { authService } from "@/src/core/auth/services/auth.service";

export async function POST() {
  try {
    await authService.logout();
    return ok({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
