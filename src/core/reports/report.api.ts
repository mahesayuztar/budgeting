import { api } from "@/src/core/lib/api-client";

export type ReportPeriod = "monthly" | "yearly";

export const reportApi = {
  downloadPdf: (period: ReportPeriod, year: number, month?: number) => {
    const filename =
      period === "yearly"
        ? `laporan-${year}.pdf`
        : `laporan-${year}-${String(month).padStart(2, "0")}.pdf`;

    return api.download("/api/reports/pdf", filename, {
      params: { period, year, month: period === "yearly" ? undefined : month },
    });
  },
};
