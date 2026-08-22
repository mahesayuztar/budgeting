import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';

/** Recent participant dan grup terakhir milik user aktif. */
export async function GET() {
  try {
    const user = await requireApiUser();
    return ok(await splitBillService.suggestions(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}
