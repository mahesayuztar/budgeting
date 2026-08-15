import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Kelas tampilan tiap varian tombol. `theme-primary` adalah warna aksi utama,
 * dan `theme-secondary` dipakai sebagai warna hover-nya yang lebih terang,
 * bukan sekadar aksen biru terpisah.
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-theme-primary hover:bg-theme-secondary text-gray-800 shadow-md shadow-theme-primary/30',
  secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
  ghost: 'bg-transparent hover:bg-black/5 text-gray-600',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
};

type ButtonOwnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

/**
 * Tombol dasar aplikasi dengan varian tampilan yang seragam. Seluruh atribut
 * tombol HTML lain diteruskan apa adanya ke elemen `<button>`.
 * @param {ButtonOwnProps} props - Props komponen.
 * @param {ButtonVariant} props.variant - Varian tampilan tombol, default primary.
 * @param {boolean} props.fullWidth - Lebarkan tombol memenuhi induknya bila true.
 * @param {string} props.className - Kelas tambahan yang digabung ke kelas bawaan.
 * @param {boolean} props.disabled - Nonaktifkan tombol bila true.
 * @param {ReactNode} props.children - Isi tombol.
 * @returns {ReactNode} Elemen tombol yang sudah bergaya.
 */
export function Button({ variant = 'primary', fullWidth, className = '', disabled, children, ...rest }: ButtonOwnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${BUTTON_VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
