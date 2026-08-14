import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { transactionService } from "@/src/core/transactions/services/transaction.service";
import {
  transactionListSchema,
  transactionSchema,
} from "@/src/core/transactions/validators/transaction.validator";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const params = transactionListSchema.parse(Object.fromEntries(searchParams));

    return ok(await transactionService.list(user.id, params));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = transactionSchema.parse(await request.json());

    return ok(await transactionService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
