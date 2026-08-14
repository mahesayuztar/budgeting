import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Parameter kueri yang dipakai semua daftar berbasis cursor. */
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
 * Keyset pagination, bukan offset: `OFFSET n` memaksa Postgres memindai dan
 * membuang n baris tiap halaman, dan baris baru menggeser jendela sehingga
 * ada data yang terlewat atau dobel saat menggulir.
 */
export function encodeCursor(parts: Array<string | number>) {
  return Buffer.from(parts.join("|"), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): string[] | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    return decoded.length > 0 ? decoded.split("|") : null;
  } catch {
    return null;
  }
}

/**
 * Mengambil `limit + 1` baris: baris ekstra hanya penanda bahwa masih ada
 * halaman berikutnya, tidak ikut dikembalikan.
 */
export function buildPage<TRow, TItem>(
  rows: TRow[],
  limit: number,
  toItem: (row: TRow) => TItem,
  toCursor: (row: TRow) => string,
): Page<TItem> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: visible.map(toItem),
    nextCursor: hasMore ? toCursor(visible[visible.length - 1]) : null,
  };
}
