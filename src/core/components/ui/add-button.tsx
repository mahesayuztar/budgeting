"use client";

import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

/**
 * Satu aksi, dua wujud: tombol sejajar header di desktop, floating di mobile.
 * Keduanya dirender dari komponen yang sama supaya state pemicunya tunggal —
 * yang floating `fixed`, jadi posisinya di DOM tidak berpengaruh.
 */
export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="hidden items-center gap-2 rounded-xl bg-theme-accent px-4 py-2.5 text-sm font-bold text-gray-800 shadow-md shadow-theme-accent/30 transition-all duration-200 hover:bg-theme-accent-light active:scale-[0.98] md:inline-flex"
      >
        <DynamicIcon icon="ph:plus" fontSize="18px" />
        {label}
      </button>

      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-theme-accent text-gray-800 shadow-lg shadow-theme-accent/40 transition-transform active:scale-95 md:hidden"
      >
        <DynamicIcon icon="ph:plus" fontSize="24px" />
      </button>
    </>
  );
}
