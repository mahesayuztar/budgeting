'use client';

import DynamicIcon from '@/src/components/commons/DynamicIcon';

type AddButtonOwnProps = {
  label: string;
  onClick: () => void;
};

/**
 * Aksi tambah data dalam dua wujud: tombol sejajar header pada layar lebar, dan
 * tombol mengambang pada layar kecil. Keduanya dirender dari komponen yang sama
 * supaya state pemicunya tunggal; tombol mengambang memakai posisi `fixed`,
 * jadi letaknya di DOM tidak memengaruhi tata letak.
 * @param {AddButtonOwnProps} props - Props komponen.
 * @param {string} props.label - Teks tombol sekaligus label aksesibilitas tombol mengambang.
 * @param {() => void} props.onClick - Dijalankan saat salah satu tombol ditekan.
 * @returns {ReactNode} Pasangan tombol tambah untuk layar lebar dan layar kecil.
 */
export function AddButton({ label, onClick }: AddButtonOwnProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="hidden items-center gap-2 rounded-xl bg-theme-primary px-4 py-2.5 text-sm font-bold text-gray-800 shadow-md shadow-theme-primary/30 transition-all duration-200 hover:bg-theme-secondary active:scale-[0.98] md:inline-flex"
      >
        <DynamicIcon icon="ph:plus" fontSize="18px" />
        {label}
      </button>

      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-theme-primary text-gray-800 shadow-lg shadow-theme-primary/40 transition-transform active:scale-95 md:hidden"
      >
        <DynamicIcon icon="ph:plus" fontSize="24px" />
      </button>
    </>
  );
}
