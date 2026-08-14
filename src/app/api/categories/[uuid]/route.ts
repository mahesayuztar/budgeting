import { handleApiError, ok } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { categoryService } from "@/src/core/categories/services/category.service";
import { categorySchema } from "@/src/core/categories/validators/category.validator";

type Context = { params: Promise<{ uuid: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = categorySchema.parse(await request.json());

    return ok(await categoryService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await categoryService.remove(user.id, uuid);

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
