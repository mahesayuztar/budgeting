import 'server-only';

import { Prisma, type AccountType, type DebtStatus, type DebtType, type TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { toAmount } from '@/src/helpers/MoneyHelper';

export type AccountBalanceHistoryRow = {
  name: string;
  type: AccountType;
  openingBalance: number;
  incoming: number;
  outgoing: number;
  closingBalance: number;
};

export type TransactionHistoryRow = {
  occurredAt: string;
  type: TransactionType;
  categoryName: string;
  accountName: string;
  toAccountName: string | null;
  note: string | null;
  amount: number;
};

export type DebtHistoryRow = {
  date: string;
  dueDate: string | null;
  party: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: DebtStatus;
  note: string | null;
};

export type DebtPaymentHistoryRow = {
  paidAt: string;
  party: string;
  amount: number;
  note: string | null;
};

/**
 * Mengubah tanggal menjadi teks `YYYY-MM-DD`, bentuk yang dipakai seluruh baris
 * riwayat sebelum digambar ke PDF.
 * @param {Date | null} value - Tanggal dari database, boleh kosong.
 * @returns {string | null} Tanggal sebagai teks, atau null bila kosong.
 */
function toDateText(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Menjumlahkan mutasi saldo sebuah akun pada rentang waktu tertentu. Uang masuk
 * berasal dari INCOME pada akun itu sendiri dan TRANSFER yang menjadikannya
 * akun tujuan, sedangkan uang keluar berasal dari EXPENSE dan TRANSFER yang
 * menjadikannya akun sumber.
 * @param {number} accountId - ID akun yang dihitung mutasinya.
 * @param {Prisma.DateTimeFilter} occurredAt - Filter rentang tanggal transaksi.
 * @returns {Promise<{ incoming: number; outgoing: number }>} Total uang masuk dan keluar pada rentang tersebut.
 */
async function sumAccountMovements(accountId: number, occurredAt: Prisma.DateTimeFilter) {
  const [income, expense, transferOut, transferIn] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId, type: 'INCOME', occurredAt }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId, type: 'EXPENSE', occurredAt }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId, type: 'TRANSFER', occurredAt }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { toAccountId: accountId, type: 'TRANSFER', occurredAt }, _sum: { amount: true } }),
  ]);

  return {
    incoming: toAmount(income._sum.amount) + toAmount(transferIn._sum.amount),
    outgoing: toAmount(expense._sum.amount) + toAmount(transferOut._sum.amount),
  };
}

class ReportHistoryService {
  /**
   * Menyusun riwayat saldo tiap akun pada satu rentang. Saldo akhir periode
   * diperoleh dengan menarik mundur saldo berjalan sebanyak mutasi yang terjadi
   * setelah rentang berakhir, lalu saldo awal dihitung dari saldo akhir dikurangi
   * mutasi di dalam rentang itu sendiri. Cara ini dipakai supaya angkanya selalu
   * konsisten dengan saldo yang tersimpan, tanpa memutar ulang seluruh riwayat.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<AccountBalanceHistoryRow[]>} Saldo awal, mutasi, dan saldo akhir tiap akun.
   */
  async getAccountBalanceHistory(userId: number, start: Date, end: Date): Promise<AccountBalanceHistoryRow[]> {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, balance: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    const rows: AccountBalanceHistoryRow[] = [];

    for (const _account of accounts) {
      const [inPeriod, afterPeriod] = await Promise.all([sumAccountMovements(_account.id, { gte: start, lt: end }), sumAccountMovements(_account.id, { gte: end })]);

      const closingBalance = toAmount(_account.balance) - (afterPeriod.incoming - afterPeriod.outgoing);
      const openingBalance = closingBalance - (inPeriod.incoming - inPeriod.outgoing);

      rows.push({
        name: _account.name,
        type: _account.type,
        openingBalance,
        incoming: inPeriod.incoming,
        outgoing: inPeriod.outgoing,
        closingBalance,
      });
    }

    return rows;
  }

  /**
   * Menyusun riwayat transaksi pada satu rentang, terurut dari yang paling awal
   * supaya terbaca sebagai catatan berjalan.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<TransactionHistoryRow[]>} Baris riwayat transaksi pada rentang tersebut.
   */
  async getTransactionHistory(userId: number, start: Date, end: Date): Promise<TransactionHistoryRow[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
      select: {
        occurredAt: true,
        type: true,
        amount: true,
        note: true,
        category: { select: { name: true } },
        account: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });

    return rows.map(_row => ({
      occurredAt: _row.occurredAt.toISOString().slice(0, 10),
      type: _row.type,
      categoryName: _row.category?.name ?? 'Tanpa Kategori',
      accountName: _row.account?.name ?? '-',
      toAccountName: _row.toAccount?.name ?? null,
      note: _row.note,
      amount: toAmount(_row.amount),
    }));
  }

  /**
   * Menyusun riwayat hutang atau piutang yang dicatat pada satu rentang, beserta
   * jumlah yang sudah terbayar dan sisanya. Rentang disaring lewat kolom tanggal
   * catatan, dan catatan lama yang tanggalnya masih kosong jatuh ke waktu
   * pembuatannya supaya tetap ikut terlaporkan. Pengurutan dikerjakan setelah
   * data terambil karena kuncinya adalah tanggal efektif itu, yang tidak dapat
   * diurutkan langsung oleh database.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {DebtType} type - Jenis catatan, PAYABLE untuk hutang atau RECEIVABLE untuk piutang.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<DebtHistoryRow[]>} Baris riwayat hutang atau piutang pada rentang tersebut.
   */
  async getDebtHistory(userId: number, type: DebtType, start: Date, end: Date): Promise<DebtHistoryRow[]> {
    const rows = await prisma.debt.findMany({
      where: {
        userId,
        type,
        OR: [{ date: { gte: start, lt: end } }, { date: null, createdAt: { gte: start, lt: end } }],
      },
      select: {
        date: true,
        createdAt: true,
        dueDate: true,
        party: true,
        amount: true,
        status: true,
        note: true,
        payments: { select: { amount: true } },
      },
    });

    return rows
      .map(_row => {
        const amount = toAmount(_row.amount);
        const paidAmount = _row.payments.reduce((_total, _payment) => _total + toAmount(_payment.amount), 0);

        return {
          date: (_row.date ?? _row.createdAt).toISOString().slice(0, 10),
          dueDate: toDateText(_row.dueDate),
          party: _row.party,
          amount,
          paidAmount,
          remaining: Math.max(amount - paidAmount, 0),
          status: _row.status,
          note: _row.note,
        };
      })
      .sort((_left, _right) => _left.date.localeCompare(_right.date));
  }

  /**
   * Menyusun riwayat pembayaran hutang atau piutang pada satu rentang. Rentang
   * disaring berdasarkan tanggal pembayaran, bukan tanggal catatan hutangnya,
   * supaya cicilan atas hutang lama tetap muncul di periode saat dibayarkan.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @param {DebtType} type - Jenis catatan induk, PAYABLE untuk hutang atau RECEIVABLE untuk piutang.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<DebtPaymentHistoryRow[]>} Baris riwayat pembayaran pada rentang tersebut.
   */
  async getDebtPaymentHistory(userId: number, type: DebtType, start: Date, end: Date): Promise<DebtPaymentHistoryRow[]> {
    const rows = await prisma.debtPayment.findMany({
      where: { paidAt: { gte: start, lt: end }, debt: { userId, type } },
      select: {
        paidAt: true,
        amount: true,
        note: true,
        debt: { select: { party: true } },
      },
      orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
    });

    return rows.map(_row => ({
      paidAt: _row.paidAt.toISOString().slice(0, 10),
      party: _row.debt.party,
      amount: toAmount(_row.amount),
      note: _row.note,
    }));
  }
}

export const reportHistoryService = new ReportHistoryService();
