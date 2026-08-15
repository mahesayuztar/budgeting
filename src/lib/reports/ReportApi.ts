import { api } from '@/src/lib/ApiClient';

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export type ReportKind = 'summary' | 'account-balance' | 'transactions' | 'payable' | 'receivable' | 'payable-payment' | 'receivable-payment';

/**
 * Daftar laporan yang tersedia beserta judul dan ikonnya. Dipakai bersama oleh
 * halaman laporan untuk menyusun tombolnya dan oleh penyusun PDF sebagai judul
 * dokumen, sehingga nama laporan tidak pernah berbeda antara layar dan berkas.
 */
export const REPORT_KINDS: ReadonlyArray<{ value: ReportKind; label: string; description: string; icon: string }> = [
  { value: 'summary', label: 'Ringkasan Keuangan', description: 'Pemasukan, pengeluaran, dan rincian per kategori.', icon: 'ph:chart-pie-slice' },
  { value: 'account-balance', label: 'Riwayat Saldo per Akun', description: 'Saldo awal, uang masuk dan keluar, serta saldo akhir tiap akun.', icon: 'ph:wallet' },
  { value: 'transactions', label: 'Riwayat Transaksi', description: 'Seluruh transaksi pada periode terpilih.', icon: 'ph:receipt' },
  { value: 'payable', label: 'Riwayat Hutang', description: 'Hutang yang dicatat beserta sisa tagihannya.', icon: 'ph:hand-withdraw' },
  { value: 'receivable', label: 'Riwayat Piutang', description: 'Piutang yang dicatat beserta sisa tagihannya.', icon: 'ph:hand-coins' },
  { value: 'payable-payment', label: 'Riwayat Pembayaran Hutang', description: 'Pembayaran hutang yang tercatat pada periode terpilih.', icon: 'ph:cash-register' },
  { value: 'receivable-payment', label: 'Riwayat Pembayaran Piutang', description: 'Penerimaan pembayaran piutang pada periode terpilih.', icon: 'ph:coins' },
];

/**
 * Mengambil judul sebuah laporan dari daftar yang tersedia.
 * @param {ReportKind} report - Jenis laporan yang dicari judulnya.
 * @returns {string} Judul laporan, atau teks `Laporan` bila jenisnya tidak dikenali.
 */
export function getReportLabel(report: ReportKind): string {
  return REPORT_KINDS.find(_kind => _kind.value === report)?.label ?? 'Laporan';
}

export type ReportParams = { report: ReportKind } & ({ period: 'weekly'; date: string } | { period: 'monthly'; year: number; month: number } | { period: 'yearly'; year: number });

const REPORT_PDF_PATH = '/api/reports/pdf';

/**
 * Menyusun query params endpoint laporan sesuai periodenya. Bentuknya dibuat
 * sebagai union supaya tiap periode hanya membawa parameter yang benar-benar
 * dipakai, dan periode mingguan tidak pernah terkirim tanpa tanggal acuan.
 * @param {ReportKind} report - Jenis laporan yang diminta.
 * @param {ReportPeriod} period - Periode laporan, weekly, monthly, atau yearly.
 * @param {number} year - Tahun laporan.
 * @param {number} month - Bulan laporan dengan Januari bernilai 1.
 * @param {string} referenceDate - Tanggal acuan akhir rentang mingguan dalam format `YYYY-MM-DD`.
 * @returns {ReportParams} Parameter laporan yang sesuai dengan periodenya.
 */
export function getReportParams(report: ReportKind, period: ReportPeriod, year: number, month: number, referenceDate: string): ReportParams {
  if (period === 'weekly') return { report, period, date: referenceDate };
  if (period === 'yearly') return { report, period, year };

  return { report, period, year, month };
}

/**
 * Menyusun nama berkas PDF laporan sesuai periodenya.
 * @param {ReportParams} params - Parameter laporan beserta periodenya.
 * @returns {string} Nama berkas PDF, misalnya `laporan-2026-08.pdf`.
 */
export function getReportFilename(params: ReportParams) {
  if (params.period === 'weekly') return `laporan-${params.report}-mingguan-${params.date}.pdf`;
  if (params.period === 'yearly') return `laporan-${params.report}-${params.year}.pdf`;

  return `laporan-${params.report}-${params.year}-${String(params.month).padStart(2, '0')}.pdf`;
}

export const reportApi = {
  preview: (params: ReportParams) => api.blob(REPORT_PDF_PATH, { params: { ...params } }),
  downloadPdf: (params: ReportParams) => api.download(REPORT_PDF_PATH, getReportFilename(params), { params: { ...params } }),
};
