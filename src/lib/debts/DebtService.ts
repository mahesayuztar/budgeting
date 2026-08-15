import 'server-only';

import { Prisma, type DebtStatus, type DebtType, type TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { NotFoundError } from '@/src/lib/Errors';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { toDateOnly } from '@/src/helpers/DateHelper';
import { buildPage, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, type Page } from '@/src/helpers/PaginationHelper';
import type { DebtInput, DebtListParams, DebtPaymentInput } from './DebtValidator';

export type DebtPaymentDTO = {
  uuid: string;
  amount: number;
  paidAt: string;
  note: string | null;
};

export type DebtDTO = {
  uuid: string;
  type: DebtType;
  party: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  note: string | null;
  dueDate: string | null;
  date: string | null;
  status: DebtStatus;
  payments: DebtPaymentDTO[];
};

const debtSelect = {
  uuid: true,
  type: true,
  party: true,
  amount: true,
  note: true,
  dueDate: true,
  date: true,
  status: true,
  payments: {
    select: { uuid: true, amount: true, paidAt: true, note: true },
    orderBy: { paidAt: 'desc' },
  },
} satisfies Prisma.DebtSelect;

type DebtRow = Prisma.DebtGetPayload<{ select: typeof debtSelect }>;

/**
 * Arah uang saat hutang atau piutang pertama dicatat. Arahnya berlawanan
 * dengan intuisi namanya: berhutang (PAYABLE) justru menambah saldo karena
 * uangnya diterima sekarang, sedangkan memberi piutang (RECEIVABLE) mengurangi
 * saldo karena uangnya dikeluarkan.
 */
const DEBT_CREATE_TRANSACTION_TYPE: Record<DebtType, TransactionType> = {
  PAYABLE: 'INCOME',
  RECEIVABLE: 'EXPENSE',
};

/**
 * Arah uang saat hutang atau piutang dibayar, berkebalikan dari saat dicatat:
 * melunasi hutang mengurangi saldo, menerima pembayaran piutang menambahnya.
 * Dengan begitu satu siklus hutang penuh, dari dicatat sampai lunas, berjumlah
 * nol dan tidak terhitung dua kali.
 */
const DEBT_PAYMENT_TRANSACTION_TYPE: Record<DebtType, TransactionType> = {
  PAYABLE: 'EXPENSE',
  RECEIVABLE: 'INCOME',
};

/**
 * Kategori bawaan dari `DEFAULT_CATEGORIES` yang dipakai transaksi otomatis
 * hutang dan piutang, supaya pencatatan otomatis tidak menambah kategori baru
 * di daftar milik pengguna.
 */
const AUTO_CATEGORY_NAME: Record<TransactionType, string> = {
  EXPENSE: 'Tagihan',
  INCOME: 'Pemasukan Lain',
  TRANSFER: 'Transfer',
};

/**
 * Mencari kategori bawaan yang dipakai transaksi otomatis hutang dan piutang.
 * @param {Prisma.TransactionClient} transaction - Client Prisma milik transaksi berjalan.
 * @param {number} userId - ID pengguna pemilik kategori.
 * @param {TransactionType} type - Jenis transaksi otomatis yang akan dibuat.
 * @returns {Promise<number | null>} ID kategori bawaan, atau null bila pengguna sudah menghapusnya.
 */
async function resolveAutoCategoryId(transaction: Prisma.TransactionClient, userId: number, type: TransactionType): Promise<number | null> {
  const category = await transaction.category.findFirst({
    where: { userId, type, name: AUTO_CATEGORY_NAME[type] },
    select: { id: true },
  });

  return category?.id ?? null;
}

/**
 * Menyusun catatan transaksi otomatis saat hutang atau piutang pertama dicatat,
 * sehingga transaksi tersebut tetap dapat dikenali di daftar transaksi.
 * @param {DebtType} type - Jenis catatan, PAYABLE atau RECEIVABLE.
 * @param {string} party - Nama pihak lawan hutang atau piutang.
 * @param {string | null} note - Catatan tambahan dari pengguna, opsional.
 * @returns {string} Catatan transaksi otomatis yang siap disimpan.
 */
function buildAutoTransactionNote(type: DebtType, party: string, note?: string | null) {
  const label = type === 'PAYABLE' ? 'Berhutang ke' : 'Piutang dari';
  const trimmedNote = note?.trim();

  return trimmedNote ? `${label} ${party} - ${trimmedNote}` : `${label} ${party}`;
}

/**
 * Membongkar cursor daftar hutang yang hanya berisi satu kolom `id`.
 * @param {string} cursor - Cursor halaman sebelumnya, opsional.
 * @returns {number | null} ID baris terakhir halaman sebelumnya, atau null bila cursor kosong atau rusak.
 */
function decodeCursorId(cursor?: string): number | null {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 1) return null;

  const id = Number(parts[0]);
  return Number.isNaN(id) ? null : id;
}

/**
 * Mengubah baris hutang dari database menjadi DTO, sekaligus menjumlahkan
 * pembayaran yang sudah masuk untuk menghitung sisa tagihannya.
 * @param {DebtRow} row - Baris hutang beserta pembayarannya hasil kueri Prisma.
 * @returns {DebtDTO} Hutang dalam bentuk yang aman dikirim ke klien.
 */
function toDTO(row: DebtRow): DebtDTO {
  const amount = toAmount(row.amount);
  const paidAmount = row.payments.reduce((_total, _payment) => _total + toAmount(_payment.amount), 0);

  return {
    uuid: row.uuid,
    type: row.type,
    party: row.party,
    amount,
    paidAmount,
    remaining: Math.max(amount - paidAmount, 0),
    note: row.note,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    date: row.date ? row.date.toISOString().slice(0, 10) : null,
    status: row.status,
    payments: row.payments.map(_payment => ({
      uuid: _payment.uuid,
      amount: toAmount(_payment.amount),
      paidAt: _payment.paidAt.toISOString().slice(0, 10),
      note: _payment.note,
    })),
  };
}

/**
 * Operasi baca dan tulis hutang serta piutang pengguna. Pencatatan dan
 * pembayaran selalu dijalankan bersama transaksi otomatisnya dalam satu
 * transaksi database, supaya catatan dan mutasi kasnya tidak pernah terpisah.
 */
class DebtService {
  /**
   * Mengambil satu halaman hutang dan piutang milik pengguna. Daftar diurutkan
   * murni `id desc` supaya cursor cukup satu kolom; mengurutkan per status atau
   * jatuh tempo akan membuat keyset butuh perbandingan majemuk.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {DebtListParams} params - Filter tipe, status, pencarian, cursor, dan limit.
   * @returns {Promise<Page<DebtDTO>>} Catatan halaman ini beserta cursor halaman berikutnya.
   */
  async list(userId: number, params: DebtListParams = {}): Promise<Page<DebtDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const cursorId = decodeCursorId(params.cursor);

    const rows = await prisma.debt.findMany({
      where: {
        userId,
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.q
          ? {
              OR: [{ party: { contains: params.q, mode: 'insensitive' } }, { note: { contains: params.q, mode: 'insensitive' } }],
            }
          : {}),
        ...(cursorId === null ? {} : { id: { lt: cursorId } }),
      },
      select: { ...debtSelect, id: true },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    return buildPage(rows, limit, toDTO, _row => encodeCursor([_row.id]));
  }

  /**
   * Mencatat hutang atau piutang baru sekaligus transaksi otomatisnya dalam
   * satu transaksi database: berhutang berarti uang masuk, memberi piutang
   * berarti uang keluar, sesuai `DEBT_CREATE_TRANSACTION_TYPE`. Kolom `id`
   * hutang ikut diambil karena dibutuhkan untuk menautkan transaksi otomatis.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {DebtInput} input - Data hutang atau piutang yang sudah tervalidasi.
   * @param {DebtType} input.type - Jenis catatan, PAYABLE atau RECEIVABLE.
   * @param {string} input.party - Nama pihak lawan hutang atau piutang.
   * @param {number} input.amount - Nilai pokok hutang atau piutang.
   * @param {string} input.date - Tanggal pencatatan dalam format `YYYY-MM-DD`.
   * @returns {Promise<DebtDTO>} Catatan hutang atau piutang yang baru dibuat.
   */
  async create(userId: number, input: DebtInput): Promise<DebtDTO> {
    const transactionType = DEBT_CREATE_TRANSACTION_TYPE[input.type];

    const row = await prisma.$transaction(async transaction => {
      const debt = await transaction.debt.create({
        data: {
          userId,
          type: input.type,
          party: input.party,
          amount: new Prisma.Decimal(input.amount),
          note: input.note?.trim() || null,
          date: toDateOnly(input.date),
          dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
        },
        select: { ...debtSelect, id: true },
      });

      const categoryId = await resolveAutoCategoryId(transaction, userId, transactionType);

      await transaction.transaction.create({
        data: {
          userId,
          categoryId,
          debtId: debt.id,
          type: transactionType,
          amount: new Prisma.Decimal(input.amount),
          note: buildAutoTransactionNote(input.type, input.party, input.note),
          occurredAt: toDateOnly(input.date),
        },
      });

      return debt;
    });

    return toDTO(row);
  }

  /**
   * Mencatat satu pembayaran hutang atau piutang. Pembayaran, transaksi
   * otomatisnya, dan pemutakhiran status dijalankan atomik: tanpa itu dua
   * pembayaran bersamaan dapat membuat hutang lunas tetapi statusnya tetap
   * OPEN, atau transaksinya tercatat tanpa pembayarannya.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {string} uuid - UUID hutang atau piutang yang dibayar.
   * @param {DebtPaymentInput} input - Data pembayaran yang sudah tervalidasi.
   * @param {number} input.amount - Nilai pembayaran.
   * @param {string} input.paidAt - Tanggal pembayaran dalam format `YYYY-MM-DD`.
   * @returns {Promise<DebtDTO>} Catatan hutang atau piutang setelah pembayaran masuk.
   * @throws {NotFoundError} Jika catatan tidak ada atau bukan milik pengguna tersebut.
   */
  async addPayment(userId: number, uuid: string, input: DebtPaymentInput): Promise<DebtDTO> {
    const debt = await this.mustOwn(userId, uuid);
    const transactionType = DEBT_PAYMENT_TRANSACTION_TYPE[debt.type];

    const row = await prisma.$transaction(async transaction => {
      await transaction.debtPayment.create({
        data: {
          debtId: debt.id,
          amount: new Prisma.Decimal(input.amount),
          paidAt: toDateOnly(input.paidAt),
          note: input.note?.trim() || null,
        },
      });

      const categoryId = await resolveAutoCategoryId(transaction, userId, transactionType);

      await transaction.transaction.create({
        data: {
          userId,
          categoryId,
          debtId: debt.id,
          type: transactionType,
          amount: new Prisma.Decimal(input.amount),
          note: input.note?.trim() || null,
          occurredAt: toDateOnly(input.paidAt),
        },
      });

      const totals = await transaction.debtPayment.aggregate({
        where: { debtId: debt.id },
        _sum: { amount: true },
      });

      const paidAmount = toAmount(totals._sum.amount);
      const isSettled = paidAmount >= toAmount(debt.amount);

      return transaction.debt.update({
        where: { id: debt.id },
        data: {
          status: isSettled ? 'PAID' : 'OPEN',
          settledAt: isSettled ? new Date() : null,
        },
        select: debtSelect,
      });
    });

    return toDTO(row);
  }

  /**
   * Menghapus catatan hutang atau piutang milik pengguna.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {string} uuid - UUID catatan yang dihapus.
   * @returns {Promise<void>} Selesai setelah catatan terhapus.
   * @throws {NotFoundError} Jika catatan tidak ada atau bukan milik pengguna tersebut.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    const debt = await this.mustOwn(userId, uuid);
    await prisma.debt.delete({ where: { id: debt.id } });
  }

  /**
   * Memastikan sebuah catatan hutang benar-benar milik pengguna sebelum diubah,
   * sekaligus mengambil kolom yang dibutuhkan operasi pembayaran.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {string} uuid - UUID catatan yang diperiksa.
   * @returns {Promise<{ id: number; amount: Prisma.Decimal; type: DebtType }>} ID internal, nilai pokok, dan jenis catatan.
   * @throws {NotFoundError} Jika catatan tidak ada atau bukan milik pengguna tersebut.
   */
  private async mustOwn(userId: number, uuid: string) {
    const debt = await prisma.debt.findFirst({
      where: { uuid, userId },
      select: { id: true, amount: true, type: true },
    });

    if (!debt) throw new NotFoundError('Data hutang/piutang tidak ditemukan.');

    return debt;
  }
}

export const debtService = new DebtService();
