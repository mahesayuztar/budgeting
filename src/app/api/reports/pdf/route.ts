import { z } from 'zod';
import { handleApiError } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { reportService } from '@/src/lib/reports/ReportService';
import { getReportFilename } from '@/src/lib/reports/ReportApi';
import { buildMonthlyReportPdf, buildYearlyReportPdf } from '@/src/lib/reports/ReportPdf';
import { transactionService } from '@/src/lib/transactions/TransactionService';

export const dynamic = 'force-dynamic';

const querySchema = z
  .object({
    period: z.enum(['monthly', 'yearly']).default('monthly'),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine(_value => _value.period === 'yearly' || _value.month !== undefined, {
    message: 'Bulan wajib diisi untuk laporan bulanan.',
    path: ['month'],
  });

/**
 * Menyusun berkas PDF laporan bulanan beserta nama berkasnya.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {number} year - Tahun periode laporan.
 * @param {number} month - Bulan periode laporan dengan Januari bernilai 1.
 * @returns {Promise<{ bytes: Uint8Array; filename: string }>} Isi berkas PDF dan nama berkasnya.
 */
async function buildMonthlyReport(userId: number, userName: string, year: number, month: number) {
  const [summary, transactions] = await Promise.all([reportService.getMonthlySummary(userId, year, month), transactionService.listAllInPeriod(userId, year, month)]);

  return {
    bytes: await buildMonthlyReportPdf({ userName, summary, transactions }),
    filename: getReportFilename('monthly', year, month),
  };
}

/**
 * Menyusun berkas PDF laporan tahunan beserta nama berkasnya.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {number} year - Tahun periode laporan.
 * @returns {Promise<{ bytes: Uint8Array; filename: string }>} Isi berkas PDF dan nama berkasnya.
 */
async function buildYearlyReport(userId: number, userName: string, year: number) {
  const summary = await reportService.getYearlySummary(userId, year);

  return {
    bytes: await buildYearlyReportPdf({ userName, summary }),
    filename: getReportFilename('yearly', year),
  };
}

/**
 * Mengirim laporan keuangan pengguna yang sedang masuk sebagai berkas PDF.
 * pdf-lib mengembalikan Uint8Array, sedangkan Buffer yang membungkusnya sudah
 * memenuhi tipe BodyInit sehingga dapat langsung dijadikan body respons.
 * @param {Request} request - Permintaan HTTP beserta query params periode laporan.
 * @returns {Promise<Response>} Berkas PDF laporan, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const { bytes, filename } =
      query.period === 'yearly' ? await buildYearlyReport(user.id, user.name, query.year) : await buildMonthlyReport(user.id, user.name, query.year, query.month!);

    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
