'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/src/components/ui/Button';
import { ErrorAlert } from '@/src/components/ui/Alert';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { useApiAction } from '@/src/hooks/useApiAction';
import { getReportParams, reportApi, type ReportPeriod } from '@/src/lib/reports/ReportApi';
import { monthLabel, weekLabel } from '@/src/helpers/DateHelper';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-gray-400">
      <DynamicIcon icon="ph:spinner" fontSize="20px" />
      Menyiapkan penampil...
    </div>
  ),
});

const REPORT_PERIOD_OPTIONS: ReadonlyArray<{ value: ReportPeriod; label: string }> = [
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

type ReportPanelOwnProps = {
  year: number;
  month: number;
  referenceDate: string;
};

/**
 * Panel pratinjau dan unduh laporan PDF. Dokumen hasil pratinjau disimpan
 * bersama periode asalnya lalu dicocokkan saat render, karena menyinkronkannya
 * lewat useEffect akan menyisakan satu frame berisi dokumen periode lama dan
 * melanggar aturan `react-hooks/set-state-in-effect`. Periode mingguan tidak
 * mengikuti tahun dan bulan yang dipilih, melainkan tujuh hari terakhir yang
 * berakhir pada tanggal acuan dari server.
 * @param {ReportPanelOwnProps} props - Props komponen.
 * @param {number} props.year - Tahun periode laporan.
 * @param {number} props.month - Bulan periode laporan dengan Januari bernilai 1.
 * @param {string} props.referenceDate - Tanggal hari ini dari server dalam format `YYYY-MM-DD`, dipakai sebagai akhir rentang mingguan.
 * @returns {ReactNode} Panel pratinjau dan unduh laporan.
 */
export default function ReportPanel({ year, month, referenceDate }: ReportPanelOwnProps) {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [loadedPreview, setLoadedPreview] = useState<{ key: string; blob: Blob } | null>(null);

  const preview = useApiAction(reportApi.preview);
  const download = useApiAction(reportApi.downloadPdf);

  const reportParams = getReportParams(period, year, month, referenceDate);
  const previewKey = `${period}-${year}-${month}-${referenceDate}`;
  const file = loadedPreview?.key === previewKey ? loadedPreview.blob : null;
  const periodLabel = period === 'weekly' ? weekLabel(referenceDate) : period === 'yearly' ? String(year) : monthLabel(year, month);

  /**
   * Mengambil PDF periode terpilih lalu menyimpannya bersama kunci periodenya.
   * @returns {Promise<void>} Selesai setelah pratinjau tersimpan atau permintaannya gagal.
   */
  async function handlePreview() {
    const blob = await preview.run(reportParams);
    if (blob) setLoadedPreview({ key: previewKey, blob });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1 lg:w-80">
            {REPORT_PERIOD_OPTIONS.map(_option => (
              <button
                key={`report_panel__period_${_option.value}`}
                type="button"
                onClick={() => setPeriod(_option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${period === _option.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {_option.label}
              </button>
            ))}
          </div>

          <p className="hidden text-xs text-gray-500 lg:block">
            Periode: <span className="font-semibold text-gray-700">{periodLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
          <Button type="button" variant="secondary" disabled={preview.pending} onClick={handlePreview}>
            <DynamicIcon icon="ph:eye" fontSize="18px" />
            {preview.pending ? 'Memuat...' : file ? 'Muat Ulang' : 'Pratinjau'}
          </Button>

          <Button type="button" disabled={download.pending} onClick={() => download.run(reportParams)}>
            <DynamicIcon icon="ph:download-simple" fontSize="18px" />
            {download.pending ? 'Menyiapkan...' : 'Download'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 lg:hidden">
        Periode: <span className="font-semibold text-gray-700">{periodLabel}</span>
      </p>

      <ErrorAlert message={preview.error ?? download.error} />

      {file && <PdfViewer file={file} />}
    </div>
  );
}
