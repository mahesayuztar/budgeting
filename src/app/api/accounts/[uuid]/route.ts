import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { accountService } from "@/src/core/accounts/services/account.service";
import { accountSchema } from "@/src/core/accounts/validators/account.validator";

type Context = { params: Promise<{ uuid: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = accountSchema.parse(await request.json());

    return ok(await accountService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await accountService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
