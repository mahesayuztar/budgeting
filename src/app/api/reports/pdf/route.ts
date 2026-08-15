import { z } from 'zod';
import { handleApiError } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { reportService } from '@/src/lib/reports/ReportService';
import { getReportFilename } from '@/src/lib/reports/ReportApi';
import { buildMonthlyReportPdf, buildWeeklyReportPdf, buildYearlyReportPdf } from '@/src/lib/reports/ReportPdf';
import { weekRange } from '@/src/helpers/DateHelper';
import { transactionService } from '@/src/lib/transactions/TransactionService';

export const dynamic = 'force-dynamic';

const querySchema = z
  .object({
    period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal acuan harus berformat YYYY-MM-DD.')
      .optional(),
  })
  .refine(_value => _value.period === 'weekly' || _value.year !== undefined, {
    message: 'Tahun wajib diisi untuk laporan bulanan dan tahunan.',
    path: ['year'],
  })
  .refine(_value => _value.period !== 'monthly' || _value.month !== undefined, {
    message: 'Bulan wajib diisi untuk laporan bulanan.',
    path: ['month'],
  })
  .refine(_value => _value.period !== 'weekly' || _value.date !== undefined, {
    message: 'Tanggal acuan wajib diisi untuk laporan mingguan.',
    path: ['date'],
  });

type ReportQuery = z.infer<typeof querySchema>;

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
    filename: getReportFilename({ period: 'monthly', year, month }),
  };
}

/**
 * Menyusun berkas PDF laporan tujuh hari terakhir beserta nama berkasnya.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {string} referenceDate - Tanggal acuan akhir rentang dalam format `YYYY-MM-DD`.
 * @returns {Promise<{ bytes: Uint8Array; filename: string }>} Isi berkas PDF dan nama berkasnya.
 */
async function buildWeeklyReport(userId: number, userName: string, referenceDate: string) {
  const { start, end } = weekRange(referenceDate);
  const [summary, transactions] = await Promise.all([reportService.getWeeklySummary(userId, referenceDate), transactionService.listAllInRange(userId, start, end)]);

  return {
    bytes: await buildWeeklyReportPdf({ userName, summary, transactions }),
    filename: getReportFilename({ period: 'weekly', date: referenceDate }),
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
    filename: getReportFilename({ period: 'yearly', year }),
  };
}

/**
 * Memilih penyusun laporan yang sesuai dengan periode yang diminta. Parameter
 * wajib tiap periode sudah dipastikan schema, sehingga nilainya aman dibaca di
 * cabang masing-masing.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {ReportQuery} query - Periode laporan beserta parameternya yang sudah tervalidasi.
 * @returns {Promise<{ bytes: Uint8Array; filename: string }>} Isi berkas PDF dan nama berkasnya.
 */
async function buildReport(userId: number, userName: string, query: ReportQuery) {
  if (query.period === 'weekly') return buildWeeklyReport(userId, userName, query.date!);
  if (query.period === 'yearly') return buildYearlyReport(userId, userName, query.year!);

  return buildMonthlyReport(userId, userName, query.year!, query.month!);
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

    const { bytes, filename } = await buildReport(user.id, user.name, query);

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
