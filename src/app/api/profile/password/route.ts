import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { profileService } from "@/src/core/profile/services/profile.service";
import { changePasswordSchema } from "@/src/core/profile/validators/profile.validator";

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
