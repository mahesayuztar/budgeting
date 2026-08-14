"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/src/core/components/ui/button";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { reportApi, type ReportPeriod } from "@/src/core/reports/report.api";
import { MONTH_NAMES_ID } from "@/src/core/lib/date";

/**
 * pdf.js menyentuh DOM saat modul dimuat, jadi viewer-nya tidak boleh ikut
 * SSR. Dipisah juga supaya ~1MB pdfjs tidak masuk bundle awal halaman.
 */
const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-gray-400">
      <DynamicIcon icon="ph:spinner" fontSize="20px" />
      Menyiapkan penampil...
    </div>
  ),
});

const PERIODS = [
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
] as const;

export default function ReportPanel({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [loaded, setLoaded] = useState<{ key: string; blob: Blob } | null>(null);

  const preview = useApiAction(reportApi.preview);
  const download = useApiAction(reportApi.downloadPdf);

  /**
   * Pratinjau disimpan bersama periode asalnya, lalu dicocokkan saat render.
   * Menyinkronkannya lewat useEffect akan menyisakan satu frame berisi
   * dokumen periode lama — dan melanggar `react-hooks/set-state-in-effect`.
   */
  const key = `${period}-${year}-${month}`;
  const file = loaded?.key === key ? loaded.blob : null;

  async function handlePreview() {
    const blob = await preview.run(period, year, month);
    if (blob) setLoaded({ key, blob });
  }

  const periodLabel =
    period === "yearly" ? String(year) : `${MONTH_NAMES_ID[month - 1]} ${year}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        {PERIODS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              period === option.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Periode: <span className="font-semibold text-gray-700">{periodLabel}</span>
      </p>

      <ErrorAlert message={preview.error ?? download.error} />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={preview.pending}
          onClick={handlePreview}
        >
          <DynamicIcon icon="ph:eye" fontSize="18px" />
          {preview.pending ? "Memuat..." : file ? "Muat Ulang" : "Pratinjau"}
        </Button>

        <Button
          type="button"
          disabled={download.pending}
          onClick={() => download.run(period, year, month)}
        >
          <DynamicIcon icon="ph:download-simple" fontSize="18px" />
          {download.pending ? "Menyiapkan..." : "Download"}
        </Button>
      </div>

      {file && <PdfViewer file={file} />}
    </div>
  );
}
