import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { debtService } from "@/src/core/debts/services/debt.service";
import { debtPaymentSchema } from "@/src/core/debts/validators/debt.validator";

type Context = { params: Promise<{ uuid: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = debtPaymentSchema.parse(await request.json());

    return ok(await debtService.addPayment(user.id, uuid, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
