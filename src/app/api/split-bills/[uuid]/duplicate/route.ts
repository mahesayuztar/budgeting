import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import { splitBillDuplicateSchema } from '@/src/lib/split-bills/SplitBillValidator';

type RouteContext = { params: Promise<{ uuid: string }> };

/** Membuat draft baru dari bill lama, secara penuh atau hanya pesertanya. */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { uuid } = await params;
    const input = splitBillDuplicateSchema.parse(await request.json());
    return ok(await splitBillService.duplicate(user.id, uuid, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
