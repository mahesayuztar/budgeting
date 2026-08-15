import { api } from '@/src/lib/ApiClient';

export type ReportPeriod = 'monthly' | 'yearly';

const REPORT_PDF_PATH = '/api/reports/pdf';

/**
 * Menyusun query params endpoint laporan. Bulan sengaja dikosongkan pada
 * periode tahunan supaya server tidak menyempitkan rentangnya.
 * @param {ReportPeriod} period - Periode laporan, monthly atau yearly.
 * @param {number} year - Tahun laporan.
 * @param {number} month - Bulan laporan dengan Januari bernilai 1, hanya dipakai pada periode monthly.
 * @returns {{ period: ReportPeriod; year: number; month: number | undefined }} Query params endpoint laporan.
 */
function getReportParams(period: ReportPeriod, year: number, month?: number) {
  return { period, year, month: period === 'yearly' ? undefined : month };
}

/**
 * Menyusun nama berkas PDF laporan sesuai periodenya.
 * @param {ReportPeriod} period - Periode laporan, monthly atau yearly.
 * @param {number} year - Tahun laporan.
 * @param {number} month - Bulan laporan dengan Januari bernilai 1, hanya dipakai pada periode monthly.
 * @returns {string} Nama berkas PDF, misalnya `laporan-2026-08.pdf`.
 */
export function getReportFilename(period: ReportPeriod, year: number, month?: number) {
  return period === 'yearly' ? `laporan-${year}.pdf` : `laporan-${year}-${String(month).padStart(2, '0')}.pdf`;
}

export const reportApi = {
  preview: (period: ReportPeriod, year: number, month?: number) => api.blob(REPORT_PDF_PATH, { params: getReportParams(period, year, month) }),
  downloadPdf: (period: ReportPeriod, year: number, month?: number) =>
    api.download(REPORT_PDF_PATH, getReportFilename(period, year, month), {
      params: getReportParams(period, year, month),
    }),
};
