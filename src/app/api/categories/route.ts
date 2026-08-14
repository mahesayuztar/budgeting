import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { categoryService } from "@/src/core/categories/services/category.service";
import { categorySchema } from "@/src/core/categories/validators/category.validator";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const { type } = querySchema.parse(Object.fromEntries(searchParams));

    return ok(await categoryService.list(user.id, type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = categorySchema.parse(await request.json());

    return ok(await categoryService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
