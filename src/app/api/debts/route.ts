import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { debtService } from "@/src/core/debts/services/debt.service";
import {
  debtListSchema,
  debtSchema,
} from "@/src/core/debts/validators/debt.validator";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const params = debtListSchema.parse(Object.fromEntries(searchParams));

    return ok(await debtService.list(user.id, params));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = debtSchema.parse(await request.json());

    return ok(await debtService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
