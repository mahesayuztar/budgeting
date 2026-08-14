import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  // theme-primary adalah warna aksi utama; secondary jadi hover-nya yang
  // lebih terang, bukan sekadar accent biru yang dulu dipakai di sini.
  primary:
    "bg-theme-primary hover:bg-theme-secondary text-gray-800 shadow-md shadow-theme-primary/30",
  secondary: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200",
  ghost: "bg-transparent hover:bg-black/5 text-gray-600",
  danger: "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth,
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${
        VARIANTS[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
