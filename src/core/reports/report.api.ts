import { api } from "@/src/core/lib/api-client";

export type ReportPeriod = "monthly" | "yearly";

const PATH = "/api/reports/pdf";

function reportParams(period: ReportPeriod, year: number, month?: number) {
  return { period, year, month: period === "yearly" ? undefined : month };
}

export function reportFilename(
  period: ReportPeriod,
  year: number,
  month?: number,
) {
  return period === "yearly"
    ? `laporan-${year}.pdf`
    : `laporan-${year}-${String(month).padStart(2, "0")}.pdf`;
}

export const reportApi = {
  /** Blob untuk dirender di layar oleh react-pdf. */
  preview: (period: ReportPeriod, year: number, month?: number) =>
    api.blob(PATH, { params: reportParams(period, year, month) }),

  downloadPdf: (period: ReportPeriod, year: number, month?: number) =>
    api.download(PATH, reportFilename(period, year, month), {
      params: reportParams(period, year, month),
    }),
};
