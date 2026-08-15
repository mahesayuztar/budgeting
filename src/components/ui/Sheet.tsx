'use client';

import { useEffect, type ReactNode } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

type SheetOwnProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Panel isian yang muncul sebagai bottom sheet pada layar sempit dan dialog di
 * tengah pada layar lebar. Selama terbuka, gulir halaman di belakangnya dikunci
 * dan tombol Escape ikut menutupnya.
 * @param {SheetOwnProps} props - Props komponen.
 * @param {boolean} props.open - Panel ditampilkan bila true.
 * @param {string} props.title - Judul panel sekaligus label aksesibilitasnya.
 * @param {() => void} props.onClose - Dijalankan saat panel diminta ditutup.
 * @param {ReactNode} props.children - Isi panel.
 * @returns {ReactNode} Panel beserta latar gelapnya, atau null bila sedang tertutup.
 */
export function Sheet({ open, title, onClose, children }: SheetOwnProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700">
            <DynamicIcon icon="ph:x" fontSize="18px" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
