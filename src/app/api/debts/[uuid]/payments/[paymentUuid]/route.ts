import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { debtService } from '@/src/lib/debts/DebtService';
import { debtPaymentUpdateSchema } from '@/src/lib/debts/DebtValidator';

type RouteContext = { params: Promise<{ uuid: string; paymentUuid: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid, paymentUuid } = await params;
    const input = debtPaymentUpdateSchema.parse(await request.json());
    return ok(await debtService.updatePayment(user.id, uuid, paymentUuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid, paymentUuid } = await params;
    return ok(await debtService.removePayment(user.id, uuid, paymentUuid));
  } catch (error) {
    return handleApiError(error);
  }
}
