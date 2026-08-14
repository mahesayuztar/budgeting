import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { accountService } from "@/src/core/accounts/services/account.service";
import { accountSchema } from "@/src/core/accounts/validators/account.validator";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["CASH", "BANK"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const { type } = querySchema.parse(Object.fromEntries(searchParams));

    return ok(await accountService.list(user.id, type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = accountSchema.parse(await request.json());

    return ok(await accountService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
