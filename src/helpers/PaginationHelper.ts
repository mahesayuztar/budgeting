import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const cursorParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type CursorParams = z.infer<typeof cursorParamsSchema>;

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

/**
 * Menyandikan penanda posisi baris terakhir menjadi cursor base64url. Daftar
 * memakai keyset pagination, bukan offset, karena `OFFSET n` memaksa Postgres
 * memindai lalu membuang n baris tiap halaman, dan baris baru menggeser jendela
 * sehingga ada data yang terlewat atau tampil dobel saat menggulir.
 * @param {Array<string | number>} parts - Nilai kolom pengurut baris terakhir halaman ini.
 * @returns {string} Cursor base64url yang aman dipakai di query string.
 */
export function encodeCursor(parts: Array<string | number>) {
  return Buffer.from(parts.join('|'), 'utf8').toString('base64url');
}

/**
 * Membongkar cursor base64url kembali menjadi nilai kolom pengurut.
 * @param {string | undefined} cursor - Cursor dari query string, boleh kosong.
 * @returns {string[] | null} Daftar nilai kolom pengurut, atau null bila cursor kosong atau rusak.
 */
export function decodeCursor(cursor: string | undefined): string[] | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    return decoded.length > 0 ? decoded.split('|') : null;
  } catch {
    return null;
  }
}

/**
 * Menyusun satu halaman hasil dari baris database. Pemanggil mengambil
 * `limit + 1` baris: baris ekstra hanya penanda bahwa masih ada halaman
 * berikutnya dan tidak ikut dikembalikan ke klien.
 * @param {TRow[]} rows - Baris hasil kueri sebanyak `limit + 1`.
 * @param {number} limit - Jumlah baris yang benar-benar ditampilkan per halaman.
 * @param {(row: TRow) => TItem} toItem - Pengubah baris database menjadi item DTO.
 * @param {(row: TRow) => string} toCursor - Pembuat cursor dari baris terakhir halaman.
 * @returns {Page<TItem>} Item halaman ini beserta cursor halaman berikutnya.
 */
export function buildPage<TRow, TItem>(rows: TRow[], limit: number, toItem: (row: TRow) => TItem, toCursor: (row: TRow) => string): Page<TItem> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: visible.map(toItem),
    nextCursor: hasMore ? toCursor(visible[visible.length - 1]) : null,
  };
}
