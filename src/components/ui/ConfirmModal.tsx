'use client';

import { useEffect } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Button } from './Button';

type ConfirmModalVariant = 'danger' | 'primary';

const CONFIRM_MODAL_ICON_STYLES: Record<ConfirmModalVariant, string> = {
  danger: 'bg-red-50 text-red-600',
  primary: 'bg-theme-light text-theme-light-border',
};

type ConfirmModalOwnProps = {
  open: boolean;
  title: string;
  description?: string;
  icon?: string;
  variant?: ConfirmModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Dialog konfirmasi untuk aksi yang sulit dibatalkan, misalnya menghapus data
 * atau keluar dari akun. Selama terbuka, gulir halaman di belakangnya dikunci
 * dan tombol Escape memicu pembatalan.
 * @param {ConfirmModalOwnProps} props - Props komponen.
 * @param {boolean} props.open - Dialog ditampilkan bila true.
 * @param {string} props.title - Pertanyaan konfirmasi yang ditampilkan sebagai judul.
 * @param {string} props.description - Penjelasan dampak aksi di bawah judul, opsional.
 * @param {string} props.icon - Nama ikon Iconify, misalnya `ph:trash` atau `ph:sign-out`, default `ph:warning-circle`.
 * @param {ConfirmModalVariant} props.variant - Nada tampilan dialog, default danger.
 * @param {string} props.confirmLabel - Teks tombol konfirmasi, default `Ya, lanjutkan`.
 * @param {string} props.cancelLabel - Teks tombol batal, default `Batal`.
 * @param {boolean} props.pending - Kunci kedua tombol selama aksi diproses.
 * @param {() => void} props.onConfirm - Dijalankan saat pengguna menyetujui aksi.
 * @param {() => void} props.onCancel - Dijalankan saat pengguna membatalkan aksi.
 * @returns {ReactNode} Dialog konfirmasi beserta latar gelapnya, atau null bila sedang tertutup.
 */
export function ConfirmModal({
  open,
  title,
  description,
  icon = 'ph:warning-circle',
  variant = 'danger',
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmModalOwnProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" aria-label="Tutup" onClick={onCancel} className="absolute inset-0 bg-black/40" />

      <div role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${CONFIRM_MODAL_ICON_STYLES[variant]}`}>
          <DynamicIcon icon={icon} fontSize="26px" />
        </span>

        <h2 className="mt-4 text-base font-bold text-gray-800">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={variant === 'danger' ? 'danger' : 'primary'} fullWidth onClick={onConfirm} disabled={pending}>
            {pending ? 'Memproses...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
