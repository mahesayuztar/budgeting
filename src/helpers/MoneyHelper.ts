import type { Prisma } from '@prisma/client';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const plainAmountFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Mengubah nilai uang dari database menjadi number biasa. `Prisma.Decimal`
 * tidak JSON-serializable dan tidak dapat melewati batas Server ke Client
 * Component, sehingga semua service wajib melewatkan nilai uang lewat function
 * ini sebelum mengembalikannya.
 * @param {DecimalLike} value - Nilai uang dari Prisma, number, string, null, atau undefined.
 * @returns {number} Nilai uang sebagai number, 0 bila kosong atau tidak terbaca sebagai angka.
 */
export function toAmount(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const amount = Number(value.toString());
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Memformat nilai uang ke format rupiah lengkap dengan simbol mata uang.
 * @param {DecimalLike} value - Nilai uang yang akan diformat.
 * @returns {string} Teks rupiah, misalnya `Rp1.500.000`.
 */
export function formatIDR(value: DecimalLike): string {
  return idrFormatter.format(toAmount(value));
}

/**
 * Memformat nilai uang tanpa simbol mata uang, dipakai pada tabel PDF yang
 * memakai font WinAnsi dan tidak dapat menggambar simbol rupiah.
 * @param {DecimalLike} value - Nilai uang yang akan diformat.
 * @returns {string} Teks angka berpemisah ribuan, misalnya `1.500.000`.
 */
export function formatAmountPlain(value: DecimalLike): string {
  return plainAmountFormatter.format(toAmount(value));
}
