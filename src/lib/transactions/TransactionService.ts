import 'server-only';

import { Prisma, type AccountType, type TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { ConflictError, NotFoundError } from '@/src/lib/Errors';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { monthRange, toDateOnly, yearRange } from '@/src/helpers/DateHelper';
import { buildPage, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, type Page } from '@/src/helpers/PaginationHelper';
import { TRANSFER_CATEGORY } from '@/src/lib/categories/CategoryService';
import type { TransactionInput, TransactionListParams } from './TransactionValidator';

export type TransactionDTO = {
  uuid: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  occurredAt: string;
  category: { uuid: string; name: string; icon: string | null; color: string | null } | null;
  account: { uuid: string; name: string; type: AccountType } | null;
  toAccount: { uuid: string; name: string; type: AccountType } | null;
};

const transactionSelect = {
  uuid: true,
  type: true,
  amount: true,
  note: true,
  occurredAt: true,
  category: { select: { uuid: true, name: true, icon: true, color: true } },
  account: { select: { uuid: true, name: true, type: true } },
  toAccount: { select: { uuid: true, name: true, type: true } },
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
    account: row.account,
    toAccount: row.toAccount,
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
 * Menentukan kategori transaksi. Transfer selalu memakai kategori sistem
 * `Transfer`, sehingga categoryUuid dari klien sengaja diabaikan. Upsert juga
 * memulihkan kategori sistem secara otomatis bila data lama belum mendapat
 * seeder atau pernah dimanipulasi langsung di database.
 * @param {number} userId - ID pengguna pemilik transaksi.
 * @param {TransactionType} type - Jenis transaksi yang akan disimpan.
 * @param {string | null} categoryUuid - UUID kategori pilihan klien untuk transaksi non-transfer.
 * @returns {Promise<number | null>} ID internal kategori yang harus dipakai.
 */
async function resolveTransactionCategoryId(userId: number, type: TransactionType, categoryUuid?: string | null) {
  if (type !== 'TRANSFER') return resolveCategoryId(userId, categoryUuid);

  const category = await prisma.category.upsert({
    where: {
      userId_name_type: {
        userId,
        name: TRANSFER_CATEGORY.name,
        type: TRANSFER_CATEGORY.type,
      },
    },
    create: { userId, ...TRANSFER_CATEGORY },
    update: {
      icon: TRANSFER_CATEGORY.icon,
      color: TRANSFER_CATEGORY.color,
    },
    select: { id: true },
  });

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

type BalanceMovement = {
  accountId: number | null;
  delta: Prisma.Decimal;
};

/**
 * Menyusun perpindahan saldo yang ditimbulkan sebuah transaksi. INCOME menambah
 * saldo akunnya, EXPENSE menguranginya, dan TRANSFER memindahkan nilai yang
 * sama dari akun sumber ke akun tujuan sehingga jumlah saldo kedua akun tidak
 * berubah.
 * @param {TransactionType} type - Jenis transaksi, INCOME, EXPENSE, atau TRANSFER.
 * @param {Prisma.Decimal} amount - Nilai transaksi.
 * @param {number | null} accountId - ID akun sumber, juga dipakai INCOME dan EXPENSE.
 * @param {number | null} toAccountId - ID akun tujuan, hanya terisi untuk TRANSFER.
 * @returns {BalanceMovement[]} Daftar perpindahan saldo yang harus diterapkan.
 */
function getBalanceMovements(type: TransactionType, amount: Prisma.Decimal, accountId: number | null, toAccountId: number | null): BalanceMovement[] {
  if (type === 'INCOME') return [{ accountId, delta: amount }];
  if (type === 'EXPENSE') return [{ accountId, delta: amount.negated() }];

  return [
    { accountId, delta: amount.negated() },
    { accountId: toAccountId, delta: amount },
  ];
}

/**
 * Membalik arah sekumpulan perpindahan saldo, dipakai untuk membatalkan
 * pengaruh nilai lama sebuah transaksi saat diubah atau dihapus.
 * @param {BalanceMovement[]} movements - Perpindahan saldo yang akan dibalik.
 * @returns {BalanceMovement[]} Perpindahan saldo dengan arah berlawanan.
 */
function negateBalanceMovements(movements: BalanceMovement[]): BalanceMovement[] {
  return movements.map(_movement => ({ accountId: _movement.accountId, delta: _movement.delta.negated() }));
}

/**
 * Menerapkan sekumpulan perpindahan saldo ke akun terkait. Perpindahan pada
 * akun yang sama digabung lebih dulu supaya tiap akun cukup ditulis sekali, dan
 * penulisannya diurutkan menurut id akun supaya dua transfer bersamaan yang
 * menyentuh pasangan akun sama tidak saling mengunci. Perubahan ditulis sebagai
 * `increment` supaya penambahan dihitung database, bukan dari nilai saldo yang
 * sudah terlanjur dibaca lebih dulu dan bisa basi.
 * @param {Prisma.TransactionClient} client - Client Prisma milik transaksi database yang sedang berjalan.
 * @param {BalanceMovement[]} movements - Perpindahan saldo yang akan diterapkan.
 * @returns {Promise<void>} Selesai setelah seluruh saldo akun terkait diperbarui.
 */
async function applyBalanceMovements(client: Prisma.TransactionClient, movements: BalanceMovement[]): Promise<void> {
  const totals = new Map<number, Prisma.Decimal>();

  for (const _movement of movements) {
    if (!_movement.accountId) continue;
    const current = totals.get(_movement.accountId) ?? new Prisma.Decimal(0);
    totals.set(_movement.accountId, current.plus(_movement.delta));
  }

  const accountIds = [...totals.keys()].sort((_left, _right) => _left - _right);

  for (const _accountId of accountIds) {
    const delta = totals.get(_accountId);
    if (!delta || delta.isZero()) continue;

    await client.account.update({
      where: { id: _accountId },
      data: { balance: { increment: delta } },
    });
  }
}

class TransactionService {
  /**
   * Mengambil satu halaman transaksi milik pengguna sesuai filter periode,
   * tipe, kategori, akun, dan kata kunci. Filter akun mencakup sisi sumber
   * maupun tujuan transfer. Kolom `id` ikut diambil semata-mata untuk membentuk
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
        AND: [
          buildPeriodFilter(params),
          buildSearchFilter(params.q),
          buildCursorFilter(params.cursor),
          ...(params.categoryUuid ? [{ category: { uuid: params.categoryUuid } }] : []),
          ...(params.accountUuid
            ? [
                {
                  OR: [{ account: { uuid: params.accountUuid } }, { toAccount: { uuid: params.accountUuid } }],
                },
              ]
            : []),
        ],
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
    const { start, end } = month ? monthRange(year, month) : yearRange(year);
    return this.listAllInRange(userId, start, end);
  }

  /**
   * Mengambil seluruh transaksi dalam satu rentang tanggal bebas tanpa
   * paginasi, dipakai laporan yang periodenya tidak jatuh tepat pada batas
   * bulan atau tahun.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<TransactionDTO[]>} Seluruh transaksi pada rentang tersebut.
   */
  async listAllInRange(userId: number, start: Date, end: Date): Promise<TransactionDTO[]> {
    return this.listInRange(userId, start, end);
  }

  /**
   * Mengambil transaksi terbaru dalam satu rentang tanggal, terurut dari yang
   * paling baru. Jumlahnya boleh dibatasi supaya kartu ringkas tidak perlu
   * mengambil seluruh isi rentangnya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @param {number} limit - Jumlah transaksi terbanyak yang diambil, tanpa batas bila kosong.
   * @returns {Promise<TransactionDTO[]>} Transaksi pada rentang tersebut, terbaru lebih dulu.
   */
  async listInRange(userId: number, start: Date, end: Date, limit?: number): Promise<TransactionDTO[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
      select: transactionSelect,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      ...(limit ? { take: limit } : {}),
    });

    return rows.map(toDTO);
  }

  /**
   * Mencatat transaksi baru milik pengguna. UUID kategori dan akun diterjemahkan
   * lebih dulu supaya keduanya dipastikan milik pengguna yang sama. Pencatatan
   * transaksi dan pemutakhiran saldo akun dijalankan atomik supaya saldo tidak
   * pernah bergerak tanpa transaksi yang mendasarinya, dan sebaliknya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {TransactionInput} input - Data transaksi yang sudah tervalidasi.
   * @param {TransactionType} input.type - Jenis transaksi, INCOME, EXPENSE, atau TRANSFER.
   * @param {number} input.amount - Nilai transaksi.
   * @param {string} input.occurredAt - Tanggal transaksi dalam format `YYYY-MM-DD`.
   * @returns {Promise<TransactionDTO>} Transaksi yang baru dibuat.
   * @throws {NotFoundError} Jika kategori atau akun tidak ada atau bukan milik pengguna tersebut.
   */
  async create(userId: number, input: TransactionInput): Promise<TransactionDTO> {
    const categoryId = await resolveTransactionCategoryId(userId, input.type, input.categoryUuid);
    const accountId = await resolveAccountId(userId, input.accountUuid);
    const toAccountId = input.type === 'TRANSFER' ? await resolveAccountId(userId, input.toAccountUuid) : null;
    const amount = new Prisma.Decimal(input.amount);

    const row = await prisma.$transaction(async client => {
      const created = await client.transaction.create({
        data: {
          userId,
          categoryId,
          accountId,
          toAccountId,
          type: input.type,
          amount,
          note: input.note?.trim() || null,
          occurredAt: toDateOnly(input.occurredAt),
        },
        select: transactionSelect,
      });

      await applyBalanceMovements(client, getBalanceMovements(input.type, amount, accountId, toAccountId));

      return created;
    });

    return toDTO(row);
  }

  /**
   * Memperbarui transaksi milik pengguna. Saldo disesuaikan dengan membatalkan
   * seluruh perpindahan nilai lama lebih dulu lalu menerapkan perpindahan nilai
   * baru, sehingga perubahan jenis, nilai, akun sumber, maupun akun tujuan
   * tetap menghasilkan saldo yang benar. Kedua rangkaian itu digabung dan
   * dijumlahkan per akun, jadi akun yang tidak berpindah cukup ditulis sekali.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang diperbarui.
   * @param {TransactionInput} input - Data transaksi yang sudah tervalidasi.
   * @param {TransactionType} input.type - Jenis transaksi, INCOME, EXPENSE, atau TRANSFER.
   * @param {number} input.amount - Nilai transaksi.
   * @param {string} input.occurredAt - Tanggal transaksi dalam format `YYYY-MM-DD`.
   * @returns {Promise<TransactionDTO>} Transaksi setelah diperbarui.
   * @throws {NotFoundError} Jika transaksi, kategori, atau akunnya tidak ada, atau bukan milik pengguna tersebut.
   */
  async update(userId: number, uuid: string, input: TransactionInput): Promise<TransactionDTO> {
    const previous = await this.mustOwn(userId, uuid);
    if (previous.debtId) throw new ConflictError('Transaksi otomatis hutang/piutang harus diubah dari menu Hutang & Piutang.');
    const categoryId = await resolveTransactionCategoryId(userId, input.type, input.categoryUuid);
    const accountId = await resolveAccountId(userId, input.accountUuid);
    const toAccountId = input.type === 'TRANSFER' ? await resolveAccountId(userId, input.toAccountUuid) : null;
    const amount = new Prisma.Decimal(input.amount);

    const previousMovements = getBalanceMovements(previous.type, previous.amount, previous.accountId, previous.toAccountId);
    const nextMovements = getBalanceMovements(input.type, amount, accountId, toAccountId);

    const row = await prisma.$transaction(async client => {
      const updated = await client.transaction.update({
        where: { id: previous.id },
        data: {
          categoryId,
          accountId,
          toAccountId,
          type: input.type,
          amount,
          note: input.note?.trim() || null,
          occurredAt: toDateOnly(input.occurredAt),
        },
        select: transactionSelect,
      });

      await applyBalanceMovements(client, [...negateBalanceMovements(previousMovements), ...nextMovements]);

      return updated;
    });

    return toDTO(row);
  }

  /**
   * Menghapus transaksi milik pengguna sekaligus membatalkan pengaruhnya
   * terhadap saldo akun, supaya saldo kembali seperti sebelum transaksi itu
   * pernah dicatat.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang dihapus.
   * @returns {Promise<void>} Selesai setelah transaksi terhapus dan saldo akunnya disesuaikan.
   * @throws {NotFoundError} Jika transaksi tidak ada atau bukan milik pengguna tersebut.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    const previous = await this.mustOwn(userId, uuid);
    if (previous.debtId) throw new ConflictError('Transaksi otomatis hutang/piutang harus dihapus dari menu Hutang & Piutang.');
    const previousMovements = getBalanceMovements(previous.type, previous.amount, previous.accountId, previous.toAccountId);

    await prisma.$transaction(async client => {
      await client.transaction.delete({ where: { id: previous.id } });
      await applyBalanceMovements(client, negateBalanceMovements(previousMovements));
    });
  }

  /**
   * Memastikan sebuah transaksi benar-benar milik pengguna sebelum diubah,
   * sekaligus mengambil nilai lamanya yang dibutuhkan untuk menghitung ulang
   * saldo akun. `userId` selalu ikut di filter supaya uuid milik orang lain
   * tidak dapat disentuh hanya dengan menebak nilainya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} uuid - UUID transaksi yang diperiksa.
   * @returns {Promise<{ id: number; accountId: number | null; type: TransactionType; amount: Prisma.Decimal }>} ID internal transaksi beserta akun, jenis, dan nilai lamanya.
   * @throws {NotFoundError} Jika transaksi tidak ada atau bukan milik pengguna tersebut.
   */
  private async mustOwn(userId: number, uuid: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { uuid, userId },
      select: { id: true, debtId: true, accountId: true, toAccountId: true, type: true, amount: true },
    });

    if (!transaction) throw new NotFoundError('Transaksi tidak ditemukan.');

    return transaction;
  }
}

export const transactionService = new TransactionService();
