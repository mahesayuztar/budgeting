'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

/**
 * Worker pdf.js harus diset di modul yang sama dengan `<Document>` dan
 * `<Page>`. Bila dipisah ke berkas lain, urutan eksekusi modul dapat membuat
 * nilai bawaannya menimpa konfigurasi ini.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type PdfPlaceholderOwnProps = {
  icon: string;
  message: string;
};

type PdfViewerOwnProps = {
  file: Blob;
};

/**
 * Keadaan sementara penampil PDF, dipakai saat dokumen sedang dimuat, gagal
 * dibuka, atau memang tidak ada.
 * @param {PdfPlaceholderOwnProps} props - Props komponen.
 * @param {string} props.icon - Nama ikon Iconify yang ditampilkan.
 * @param {string} props.message - Keterangan keadaan dokumen.
 * @returns {ReactNode} Blok keterangan yang terpusat.
 */
function PdfPlaceholder({ icon, message }: PdfPlaceholderOwnProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
      <DynamicIcon icon={icon} fontSize="28px" />
      <p className="text-xs font-semibold">{message}</p>
    </div>
  );
}

/**
 * Penampil dokumen PDF di dalam halaman. Lebar tiap halaman dokumen mengikuti
 * lebar wadahnya lewat ResizeObserver, sehingga dokumen tetap terbaca penuh di
 * layar ponsel tanpa perlu digulir menyamping.
 * @param {PdfViewerOwnProps} props - Props komponen.
 * @param {Blob} props.file - Isi berkas PDF yang ditampilkan.
 * @returns {ReactNode} Penampil dokumen beserta keterangan jumlah halamannya.
 */
export default function PdfViewer({ file }: PdfViewerOwnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([_entry]) => {
      setWidth(_entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="max-h-[70vh] overflow-y-auto rounded-xl bg-gray-100 p-2">
        {width > 0 && (
          <Document
            file={file}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
            loading={<PdfPlaceholder icon="ph:spinner" message="Memuat dokumen..." />}
            error={<PdfPlaceholder icon="ph:warning" message="Dokumen gagal dibuka." />}
            noData={<PdfPlaceholder icon="ph:file-x" message="Tidak ada dokumen." />}
            className="flex flex-col items-center gap-3"
          >
            {Array.from({ length: numPages }, (_unused, _index) => (
              <Page
                key={`pdf_viewer__page_${_index + 1}`}
                pageNumber={_index + 1}
                width={width - 16}
                renderAnnotationLayer={false}
                className="overflow-hidden rounded-lg shadow-sm"
                loading=""
              />
            ))}
          </Document>
        )}
      </div>

      {numPages > 0 && <p className="text-center text-[11px] text-gray-400">{numPages} halaman</p>}
    </div>
  );
}
