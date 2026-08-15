import 'server-only';

import { Prisma, type TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { NotFoundError } from '@/src/lib/Errors';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { monthRange, toDateOnly, yearRange } from '@/src/helpers/DateHelper';
import { buildPage, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, type Page } from '@/src/helpers/PaginationHelper';
import type { TransactionInput, TransactionListParams } from './TransactionValidator';

export type TransactionDTO = {
  uuid: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  occurredAt: string;
  category: { uuid: string; name: string; icon: string | null; color: string | null } | null;
};

const transactionSelect = {
  uuid: true,
  type: true,
  amount: true,
  note: true,
  occurredAt: true,
  category: { select: { uuid: true, name: true, icon: true, color: true } },
} satisfies Prisma.TransactionSelect;

type TransactionRow = Prisma.TransactionGetPayload<{ select: typeof transactionSelect }>;

/**
 * Mengubah baris transaksi dari database menjadi DTO. Kolom Decimal dan Date
 * tidak boleh menyeberang ke Client Component apa adanya, jadi keduanya
 * diubah menjadi number dan teks `YYYY-MM-DD`.
 * @param {TransactionRow} row - Baris transaksi hasil kueri Prisma.
 * @returns {TransactionDTO} Transaksi dalam bentuk yang aman dikirim ke klien.
 */
function toDTO(row: TransactionRow): TransactionDTO {
  return {
    uuid: row.uuid,
    type: row.type,
    amount: toAmount(row.amount),
    note: row.note,
    occurredAt: row.occurredAt.toISOString().slice(0, 10),
    category: row.category,
  };
}

/**
 * Menyusun filter rentang tanggal dari parameter periode. Tanpa tahun, filter
 * dikosongkan sehingga seluruh periode ikut terambil.
 * @param {TransactionListParams} params - Parameter daftar transaksi.
 * @param {number} params.year - Tahun periode, opsional.
 * @param {number} params.month - Bulan periode dengan Januari bernilai 1, opsional.
 * @returns {Prisma.TransactionWhereInput} Potongan filter Prisma untuk kolom `occurredAt`.
 */
function buildPeriodFilter(params: TransactionListParams): Prisma.TransactionWhereInput {
  if (!params.year) return {};

  const { start, end } = params.month ? monthRange(params.year, params.month) : yearRange(params.year);

  return { occurredAt: { gte: start, lt: end } };
}

/**
 * Menyusun filter pencarian yang mencocokkan kata kunci pada catatan maupun
 * nama kategori, tanpa membedakan huruf besar dan kecil.
 * @param {string} q - Kata kunci pencarian, opsional.
 * @returns {Prisma.TransactionWhereInput} Potongan filter Prisma untuk pencarian teks.
 */
function buildSearchFilter(q?: string): Prisma.TransactionWhereInput {
  if (!q) return {};

  return {
    OR: [{ note: { contains: q, mode: 'insensitive' } }, { category: { name: { contains: q, mode: 'insensitive' } } }],
  };
}

/**
 * Menyusun filter keyset pagination dari cursor. Daftar diurutkan berdasarkan
 * `occurredAt` lalu `id` secara menurun, sehingga cursor harus membandingkan
 * keduanya: memakai tanggal saja akan melewatkan transaksi lain pada hari yang
 * sama.
 * @param {string} cursor - Cursor halaman sebelumnya, opsional.
 * @returns {Prisma.TransactionWhereInput} Potongan filter Prisma untuk halaman berikutnya.
 */
function buildCursorFilter(cursor?: string): Prisma.TransactionWhereInput {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 2) return {};

  const [date, rawId] = parts;
  const occurredAt = toDateOnly(date);
  const id = Number(rawId);
  if (Number.isNaN(id)) return {};

  return {
    OR: [{ occurredAt: { lt: occurredAt } }, { occurredAt, id: { lt: id } }],
  };
}

/**
 * Menerjemahkan uuid kategori menjadi ID internal, sekaligus memastikan
 * kategori tersebut memang milik pengguna yang bersangkutan.
 * @param {number} userId - ID pengguna pemilik kategori.
 * @param {string | null} categoryUuid - UUID kategori, boleh kosong untuk transaksi tanpa kategori.
 * @returns {Promise<number | null>} ID internal kategori, atau null bila uuid kosong.
 * @throws {NotFoundError} Jika kategori tidak ada atau bukan milik pengguna tersebut.
 */
async function resolveCategoryId(userId: number, categoryUuid?: string | null) {
  if (!categoryUuid) return null;

  const category = await prisma.category.findFirst({
    where: { uuid: categoryUuid, userId },
    select: { id: true },
  });

  if (!category) throw new NotFoundError('Kategori tidak ditemukan.');

  return category.id;
}

/**
 * Menerjemahkan uuid akun menjadi ID internal, sekaligus memastikan akun
 * tersebut memang milik pengguna yang bersangkutan.
 * @param {number} userId - ID pengguna pemilik akun.
 * @param {string | null} accountUuid - UUID akun, boleh kosong untuk transaksi tanpa akun.
 * @returns {Promise<number | null>} ID internal akun, atau null bila uuid kosong.
 * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
 */
async function resolveAccountId(userId: number, accountUuid?: string | null) {
  if (!accountUuid) return null;

  const account = await prisma.account.findFirst({
    where: { uuid: accountUuid, userId },
    select: { id: true },
  });

  if (!account) throw new NotFoundError('Akun tidak ditemukan.');

  return account.id;
}

class TransactionService {
  /**
   * Mengambil satu halaman transaksi milik pengguna sesuai filter periode,
   * tipe, dan kata kunci. Kolom `id` ikut diambil semata-mata untuk membentuk
   * cursor dan tidak diteruskan ke DTO.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {TransactionListParams} params - Filter periode, tipe, pencarian, cursor, dan limit.
   * @returns {Promise<Page<TransactionDTO>>} Transaksi halaman ini beserta cursor halaman berikutnya.
   */
  async list(userId: number, params: TransactionListParams = {}): Promise<Page<TransactionDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;

    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        ...(params.type ? { type: params.type } : {}),
        AND: [buildPeriodFilter(params), buildSearchFilter(params.q), buildCursorFilter(params.cursor)],
      },
      select: { ...transactionSelect, id: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    return buildPage(rows, limit, toDTO, _row => encodeCursor([_row.occurredAt.toISOString().slice(0, 10), _row.id]));
  }

  /**
   * Mengambil seluruh transaksi dalam satu periode tanpa paginasi. Laporan PDF
   * membutuhkan periode penuh, dan pemisahan ini menjaga agar batas paginasi
   * tidak diam-diam memotong isi laporan.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {number} year - Tahun periode laporan.
   * @param {number} month - Bulan periode laporan dengan Januari bernilai 1, opsional.
   * @returns {Promise<TransactionDTO[]>} Seluruh transaksi pada periode tersebut.
   */
  async listAllInPeriod(userId: number, year: number, month?: number): Promise<TransactionDTO[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, ...buildPeriodFilter({ year, month }) },
      select: transactionSelect,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toDTO);
  }

  /**
   * Mencatat transaksi baru milik pengguna. UUID kategori dan akun diterjemahkan
   * lebih dulu supaya keduanya dipastikan milik pengguna yang sama.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {TransactionInput} input - Data transaksi yang sudah tervalidasi.
   * @param {TransactionType} input.type - Jenis transaksi, INCOME, EXPENSE, atau TRANSFER.
   * @param {number} input.amount - Nilai transaksi.
   * @param {string} input.occurredAt - Tanggal transaksi dalam format `YYYY-MM-DD`.
   * @returns {Promise<TransactionDTO>} Transaksi yang baru dibuat.
   * @throws {NotFoundError} Jika kategori atau akun tidak ada atau bukan milik pengguna tersebut.
   */
  async create(userId: number, input: TransactionInput): Promise<TransactionDTO> {
    const categoryId = await resolveCategoryId(userId, input.categoryUuid);
    await resolveAccountId(userId, input.accountUuid);

    const row = await prisma.transaction.create({
      data: {
        userId,
        categoryId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        occurredAt: toDateOnly(input.occurredAt),
      },
      select: transactionSelect,
    });

    return toDTO(row);
  }

  /**
   * Memperbarui transaksi milik pengguna.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang diperbarui.
   * @param {TransactionInput} input - Data transaksi yang sudah tervalidasi.
   * @param {TransactionType} input.type - Jenis transaksi, INCOME, EXPENSE, atau TRANSFER.
   * @param {number} input.amount - Nilai transaksi.
   * @param {string} input.occurredAt - Tanggal transaksi dalam format `YYYY-MM-DD`.
   * @returns {Promise<TransactionDTO>} Transaksi setelah diperbarui.
   * @throws {NotFoundError} Jika transaksi atau kategorinya tidak ada, atau bukan milik pengguna tersebut.
   */
  async update(userId: number, uuid: string, input: TransactionInput): Promise<TransactionDTO> {
    await this.mustOwn(userId, uuid);
    const categoryId = await resolveCategoryId(userId, input.categoryUuid);

    const row = await prisma.transaction.update({
      where: { uuid },
      data: {
        categoryId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        occurredAt: toDateOnly(input.occurredAt),
      },
      select: transactionSelect,
    });

    return toDTO(row);
  }

  /**
   * Menghapus transaksi milik pengguna.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang dihapus.
   * @returns {Promise<void>} Selesai setelah transaksi terhapus.
   * @throws {NotFoundError} Jika transaksi tidak ada atau bukan milik pengguna tersebut.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    await this.mustOwn(userId, uuid);
    await prisma.transaction.delete({ where: { uuid } });
  }

  /**
   * Memastikan sebuah transaksi benar-benar milik pengguna sebelum diubah.
   * `userId` selalu ikut di filter supaya uuid milik orang lain tidak dapat
   * disentuh hanya dengan menebak nilainya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang diperiksa.
   * @returns {Promise<{ id: number }>} ID internal transaksi.
   * @throws {NotFoundError} Jika transaksi tidak ada atau bukan milik pengguna tersebut.
   */
  private async mustOwn(userId: number, uuid: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { uuid, userId },
      select: { id: true },
    });

    if (!transaction) throw new NotFoundError('Transaksi tidak ditemukan.');

    return transaction;
  }
}

export const transactionService = new TransactionService();
