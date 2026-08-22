import { handleApiError, ok } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import { splitBillListSchema, splitBillSchema } from '@/src/lib/split-bills/SplitBillValidator';

/** Mengambil satu halaman riwayat Bagi Tagihan milik pengguna aktif. */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const params = splitBillListSchema.parse(Object.fromEntries(searchParams));
    return ok(await splitBillService.list(user.id, params));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Membuat aggregate bill baru sebagai draft atau finalized. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = splitBillSchema.parse(await request.json());
    return ok(await splitBillService.create(user.id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
