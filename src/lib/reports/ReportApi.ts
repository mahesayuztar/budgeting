import { api } from '@/src/lib/ApiClient';

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export type ReportParams = { period: 'weekly'; date: string } | { period: 'monthly'; year: number; month: number } | { period: 'yearly'; year: number };

const REPORT_PDF_PATH = '/api/reports/pdf';

/**
 * Menyusun query params endpoint laporan sesuai periodenya. Bentuknya dibuat
 * sebagai union supaya tiap periode hanya membawa parameter yang benar-benar
 * dipakai, dan periode mingguan tidak pernah terkirim tanpa tanggal acuan.
 * @param {ReportPeriod} period - Periode laporan, weekly, monthly, atau yearly.
 * @param {number} year - Tahun laporan.
 * @param {number} month - Bulan laporan dengan Januari bernilai 1.
 * @param {string} referenceDate - Tanggal acuan akhir rentang mingguan dalam format `YYYY-MM-DD`.
 * @returns {ReportParams} Parameter laporan yang sesuai dengan periodenya.
 */
export function getReportParams(period: ReportPeriod, year: number, month: number, referenceDate: string): ReportParams {
  if (period === 'weekly') return { period, date: referenceDate };
  if (period === 'yearly') return { period, year };

  return { period, year, month };
}

/**
 * Menyusun nama berkas PDF laporan sesuai periodenya.
 * @param {ReportParams} params - Parameter laporan beserta periodenya.
 * @returns {string} Nama berkas PDF, misalnya `laporan-2026-08.pdf`.
 */
export function getReportFilename(params: ReportParams) {
  if (params.period === 'weekly') return `laporan-mingguan-${params.date}.pdf`;
  if (params.period === 'yearly') return `laporan-${params.year}.pdf`;

  return `laporan-${params.year}-${String(params.month).padStart(2, '0')}.pdf`;
}

export const reportApi = {
  preview: (params: ReportParams) => api.blob(REPORT_PDF_PATH, { params: { ...params } }),
  downloadPdf: (params: ReportParams) => api.download(REPORT_PDF_PATH, getReportFilename(params), { params: { ...params } }),
};
