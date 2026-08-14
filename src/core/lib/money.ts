import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

/**
 * `Prisma.Decimal` tidak JSON-serializable dan tidak bisa melewati batas
 * Server -> Client Component. Semua service wajib melewatkan nilai uang
 * lewat helper ini sebelum dikembalikan.
 */
export function toAmount(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(value: DecimalLike): string {
  return idr.format(toAmount(value));
}

/** Versi tanpa simbol mata uang, untuk tabel PDF (font WinAnsi). */
export function formatAmountPlain(value: DecimalLike): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toAmount(value));
}
