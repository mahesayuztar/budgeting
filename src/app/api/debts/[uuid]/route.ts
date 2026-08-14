import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { debtService } from "@/src/core/debts/services/debt.service";

type Context = { params: Promise<{ uuid: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await debtService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
