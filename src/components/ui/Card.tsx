import type { ReactNode } from 'react';

type CardOwnProps = {
  children: ReactNode;
  className?: string;
};

type SectionTitleOwnProps = {
  title: string;
  action?: ReactNode;
};

/**
 * Wadah putih bersudut membulat yang dipakai sebagai kartu di seluruh halaman.
 * @param {CardOwnProps} props - Props komponen.
 * @param {ReactNode} props.children - Isi kartu.
 * @param {string} props.className - Kelas tambahan yang digabung ke kelas bawaan.
 * @returns {ReactNode} Kartu berisi elemen anaknya.
 */
export function Card({ children, className = '' }: CardOwnProps) {
  return <div className={`min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/**
 * Judul bagian di dalam kartu, dengan aksi opsional yang diratakan ke kanan.
 * @param {SectionTitleOwnProps} props - Props komponen.
 * @param {string} props.title - Teks judul bagian.
 * @param {ReactNode} props.action - Elemen aksi di sisi kanan judul, opsional.
 * @returns {ReactNode} Baris judul bagian beserta aksinya.
 */
export function SectionTitle({ title, action }: SectionTitleOwnProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      {action}
    </div>
  );
}
