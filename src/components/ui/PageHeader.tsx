import type { ReactNode } from 'react';

type PageHeaderOwnProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Kepala halaman berisi judul, keterangan singkat, dan area aksi di sisi kanan
 * yang membungkus ke baris berikutnya pada layar sempit.
 * @param {PageHeaderOwnProps} props - Props komponen.
 * @param {string} props.title - Judul halaman.
 * @param {string} props.subtitle - Keterangan singkat di bawah judul, opsional.
 * @param {ReactNode} props.children - Tombol aksi yang ditempatkan di sisi kanan, opsional.
 * @returns {ReactNode} Kepala halaman yang responsif.
 */
export function PageHeader({ title, subtitle, children }: PageHeaderOwnProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-800 md:text-2xl">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
