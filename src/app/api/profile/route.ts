import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { profileService } from "@/src/core/profile/services/profile.service";
import { profileSchema } from "@/src/core/profile/validators/profile.validator";

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = profileSchema.parse(await request.json());

    return ok(await profileService.update(user.id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
