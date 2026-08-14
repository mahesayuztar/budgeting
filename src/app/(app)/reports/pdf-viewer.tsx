"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

/**
 * Harus diset di modul yang sama dengan <Document>/<Page>. Kalau dipisah ke
 * file lain, urutan eksekusi modul bisa membuat nilai default menimpanya.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function Placeholder({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
      <DynamicIcon icon={icon} fontSize="28px" />
      <p className="text-xs font-semibold">{message}</p>
    </div>
  );
}

export default function PdfViewer({ file }: { file: Blob }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  // Lebar halaman mengikuti container supaya pas di layar ponsel.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-y-auto rounded-xl bg-gray-100 p-2"
      >
        {width > 0 && (
          <Document
            file={file}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
            loading={<Placeholder icon="ph:spinner" message="Memuat dokumen..." />}
            error={
              <Placeholder icon="ph:warning" message="Dokumen gagal dibuka." />
            }
            noData={<Placeholder icon="ph:file-x" message="Tidak ada dokumen." />}
            className="flex flex-col items-center gap-3"
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={index}
                pageNumber={index + 1}
                width={width - 16}
                renderAnnotationLayer={false}
                className="overflow-hidden rounded-lg shadow-sm"
                loading=""
              />
            ))}
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <p className="text-center text-[11px] text-gray-400">
          {numPages} halaman
        </p>
      )}
    </div>
  );
}
