import { z } from 'zod';
import { handleApiError } from '@/src/lib/ApiResponse';
import { requireApiUser } from '@/src/lib/auth/AuthDal';
import { reportService } from '@/src/lib/reports/ReportService';
import { reportHistoryService } from '@/src/lib/reports/ReportHistoryService';
import { getReportFilename, getReportLabel, type ReportParams } from '@/src/lib/reports/ReportApi';
import { buildMonthlyReportPdf, buildWeeklyReportPdf, buildYearlyReportPdf } from '@/src/lib/reports/ReportPdf';
import { buildAccountBalanceHistoryPdf, buildDebtHistoryPdf, buildDebtPaymentHistoryPdf, buildTransactionHistoryPdf } from '@/src/lib/reports/ReportHistoryPdf';
import { monthLabel, monthRange, weekLabel, weekRange, yearRange } from '@/src/helpers/DateHelper';
import { transactionService } from '@/src/lib/transactions/TransactionService';

export const dynamic = 'force-dynamic';

const querySchema = z
  .object({
    report: z.enum(['summary', 'account-balance', 'transactions', 'payable', 'receivable', 'payable-payment', 'receivable-payment']).default('summary'),
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
 * Menyusun kembali parameter laporan dari query yang sudah tervalidasi, supaya
 * nama berkasnya dibentuk oleh function yang sama dengan yang dipakai klien.
 * @param {ReportQuery} query - Query laporan yang sudah tervalidasi.
 * @returns {ReportParams} Parameter laporan sesuai periodenya.
 */
function toReportParams(query: ReportQuery): ReportParams {
  if (query.period === 'weekly') return { report: query.report, period: 'weekly', date: query.date! };
  if (query.period === 'yearly') return { report: query.report, period: 'yearly', year: query.year! };

  return { report: query.report, period: 'monthly', year: query.year!, month: query.month! };
}

/**
 * Menerjemahkan periode laporan menjadi rentang tanggal beserta labelnya.
 * Parameter wajib tiap periode sudah dipastikan schema, sehingga nilainya aman
 * dibaca di cabang masing-masing.
 * @param {ReportQuery} query - Query laporan yang sudah tervalidasi.
 * @returns {{ start: Date; end: Date; periodLabel: string }} Rentang tanggal dan label periodenya.
 */
function resolveReportRange(query: ReportQuery) {
  if (query.period === 'weekly') {
    const { start, end } = weekRange(query.date!);
    return { start, end, periodLabel: weekLabel(query.date!) };
  }

  if (query.period === 'yearly') {
    const { start, end } = yearRange(query.year!);
    return { start, end, periodLabel: String(query.year) };
  }

  const { start, end } = monthRange(query.year!, query.month!);
  return { start, end, periodLabel: monthLabel(query.year!, query.month!) };
}

/**
 * Menyusun isi PDF laporan ringkasan keuangan sesuai periodenya.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {ReportQuery} query - Query laporan yang sudah tervalidasi.
 * @returns {Promise<Uint8Array>} Isi berkas PDF ringkasan.
 */
async function buildSummaryBytes(userId: number, userName: string, query: ReportQuery) {
  if (query.period === 'weekly') {
    const { start, end } = weekRange(query.date!);
    const [summary, transactions] = await Promise.all([reportService.getWeeklySummary(userId, query.date!), transactionService.listAllInRange(userId, start, end)]);
    return buildWeeklyReportPdf({ userName, summary, transactions });
  }

  if (query.period === 'yearly') {
    const summary = await reportService.getYearlySummary(userId, query.year!);
    return buildYearlyReportPdf({ userName, summary });
  }

  const [summary, transactions] = await Promise.all([
    reportService.getMonthlySummary(userId, query.year!, query.month!),
    transactionService.listAllInPeriod(userId, query.year!, query.month!),
  ]);

  return buildMonthlyReportPdf({ userName, summary, transactions });
}

/**
 * Menyusun isi PDF salah satu laporan riwayat. Hutang dan piutang memakai
 * penyusun yang sama karena bentuk kolomnya identik, hanya jenis catatannya
 * yang berbeda; hal yang sama berlaku untuk kedua laporan pembayarannya.
 * @param {number} userId - ID pengguna pemilik laporan.
 * @param {string} userName - Nama pengguna yang dicetak di kepala laporan.
 * @param {ReportQuery} query - Query laporan yang sudah tervalidasi.
 * @returns {Promise<Uint8Array>} Isi berkas PDF riwayat.
 */
async function buildHistoryBytes(userId: number, userName: string, query: ReportQuery) {
  const { start, end, periodLabel } = resolveReportRange(query);
  const context = { title: getReportLabel(query.report), period: periodLabel, userName };

  if (query.report === 'account-balance') {
    return buildAccountBalanceHistoryPdf(context, await reportHistoryService.getAccountBalanceHistory(userId, start, end));
  }

  if (query.report === 'transactions') {
    return buildTransactionHistoryPdf(context, await reportHistoryService.getTransactionHistory(userId, start, end));
  }

  if (query.report === 'payable' || query.report === 'receivable') {
    const type = query.report === 'payable' ? 'PAYABLE' : 'RECEIVABLE';
    return buildDebtHistoryPdf(context, await reportHistoryService.getDebtHistory(userId, type, start, end));
  }

  const type = query.report === 'payable-payment' ? 'PAYABLE' : 'RECEIVABLE';
  return buildDebtPaymentHistoryPdf(context, await reportHistoryService.getDebtPaymentHistory(userId, type, start, end));
}

/**
 * Mengirim laporan pengguna yang sedang masuk sebagai berkas PDF. pdf-lib
 * mengembalikan Uint8Array, sedangkan Buffer yang membungkusnya sudah memenuhi
 * tipe BodyInit sehingga dapat langsung dijadikan body respons.
 * @param {Request} request - Permintaan HTTP beserta query params jenis dan periode laporan.
 * @returns {Promise<Response>} Berkas PDF laporan, atau respons error.
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const bytes = query.report === 'summary' ? await buildSummaryBytes(user.id, user.name, query) : await buildHistoryBytes(user.id, user.name, query);

    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${getReportFilename(toReportParams(query))}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
