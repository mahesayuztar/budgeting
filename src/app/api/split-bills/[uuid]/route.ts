import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import { splitBillUpdateSchema } from '@/src/lib/split-bills/SplitBillValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/** Mengambil detail aggregate bill milik pengguna aktif. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    return ok(await splitBillService.get(user.id, uuid));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Mengganti aggregate bill secara atomik dengan optimistic version check. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = splitBillUpdateSchema.parse(await request.json());
    return ok(await splitBillService.update(user.id, uuid, input));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Menghapus bill dan seluruh child record melalui cascade. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    await splitBillService.remove(user.id, uuid);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
