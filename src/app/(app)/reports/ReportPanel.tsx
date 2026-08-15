'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/src/components/ui/Button';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { Sheet } from '@/src/components/ui/Sheet';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { useApiAction } from '@/src/hooks/useApiAction';
import { getReportParams, REPORT_KINDS, reportApi, type ReportKind, type ReportPeriod } from '@/src/lib/reports/ReportApi';
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
 * Panel daftar laporan. Tiap laporan diwakili satu tombol; menekannya membuka
 * dialog pemilih periode yang menyediakan aksi pratinjau dan unduh untuk
 * laporan itu saja. Hasil pratinjau ditampilkan pada dialog terpisah yang lebih
 * lebar, dan dialog itu hanya dipasang saat ada dokumen sehingga isinya selalu
 * mengikuti laporan yang terakhir diminta tanpa perlu disinkronkan lewat
 * useEffect. Periode mingguan tidak mengikuti bulan yang dipilih, melainkan
 * tujuh hari terakhir yang berakhir pada tanggal acuan dari server.
 * @param {ReportPanelOwnProps} props - Props komponen.
 * @param {number} props.year - Tahun periode laporan.
 * @param {number} props.month - Bulan periode laporan dengan Januari bernilai 1.
 * @param {string} props.referenceDate - Tanggal hari ini dari server dalam format `YYYY-MM-DD`, dipakai sebagai akhir rentang mingguan.
 * @returns {ReactNode} Daftar tombol laporan beserta dialog periode dan pratinjaunya.
 */
export default function ReportPanel({ year, month, referenceDate }: ReportPanelOwnProps) {
  const [activeReport, setActiveReport] = useState<ReportKind | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [previewFile, setPreviewFile] = useState<{ title: string; blob: Blob } | null>(null);

  const preview = useApiAction(reportApi.preview);
  const download = useApiAction(reportApi.downloadPdf);

  const activeKind = REPORT_KINDS.find(_kind => _kind.value === activeReport);
  const periodLabel = period === 'weekly' ? weekLabel(referenceDate) : period === 'yearly' ? String(year) : monthLabel(year, month);

  function openReport(report: ReportKind) {
    preview.reset();
    download.reset();
    setPeriod('monthly');
    setActiveReport(report);
  }

  async function handlePreview() {
    if (!activeKind) return;

    const blob = await preview.run(getReportParams(activeKind.value, period, year, month, referenceDate));
    if (!blob) return;

    setPreviewFile({ title: `${activeKind.label} - ${periodLabel}`, blob });
    setActiveReport(null);
  }

  async function handleDownload() {
    if (!activeKind) return;
    await download.run(getReportParams(activeKind.value, period, year, month, referenceDate));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">Pilih laporan untuk menentukan periodenya, lalu pratinjau atau unduh sebagai PDF.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {REPORT_KINDS.map(_kind => (
          <button
            key={`report_panel__kind_${_kind.value}`}
            type="button"
            onClick={() => openReport(_kind.value)}
            className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-3 text-left transition-colors hover:border-theme-light-border hover:bg-theme-light"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-light text-gray-700">
              <DynamicIcon icon={_kind.icon} fontSize="18px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-800">{_kind.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">{_kind.description}</span>
            </span>
            <DynamicIcon icon="ph:caret-right" fontSize="16px" className="mt-1 shrink-0 text-gray-300" />
          </button>
        ))}
      </div>

      {activeKind && (
        <Sheet open title={activeKind.label} onClose={() => setActiveReport(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-gray-500">{activeKind.description}</p>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-gray-700">Periode</span>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
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
            </div>

            <p className="rounded-xl bg-theme-light px-4 py-3 text-xs font-semibold text-gray-600">
              Periode terpilih: <span className="text-gray-800">{periodLabel}</span>
            </p>

            <ErrorAlert message={preview.error ?? download.error} />

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" disabled={preview.pending} onClick={handlePreview}>
                <DynamicIcon icon="ph:eye" fontSize="18px" />
                {preview.pending ? 'Memuat...' : 'Pratinjau'}
              </Button>

              <Button type="button" disabled={download.pending} onClick={handleDownload}>
                <DynamicIcon icon="ph:download-simple" fontSize="18px" />
                {download.pending ? 'Menyiapkan...' : 'Download'}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {previewFile && (
        <Sheet open size="lg" title={previewFile.title} onClose={() => setPreviewFile(null)}>
          <PdfViewer file={previewFile.blob} />
        </Sheet>
      )}
    </div>
  );
}
