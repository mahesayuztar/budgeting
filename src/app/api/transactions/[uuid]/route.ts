import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { transactionService } from "@/src/core/transactions/services/transaction.service";
import { transactionSchema } from "@/src/core/transactions/validators/transaction.validator";

// Next 16: `params` adalah Promise.
type Context = { params: Promise<{ uuid: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = transactionSchema.parse(await request.json());

    return ok(await transactionService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await transactionService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
