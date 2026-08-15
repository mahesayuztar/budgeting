import 'server-only';

import type { AccountType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { monthRange, toDateInputValue, weekRange, yearRange } from '@/src/helpers/DateHelper';
import { transactionService, type TransactionDTO } from '@/src/lib/transactions/TransactionService';

export type CategoryBreakdown = {
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  share: number;
};

export type PeriodSummary = {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
};

export type MonthlySummary = PeriodSummary & {
  year: number;
  month: number;
};

export type WeeklySummary = PeriodSummary & {
  startDate: string;
  endDate: string;
};

export type MonthPoint = {
  month: number;
  income: number;
  expense: number;
  net: number;
};

export type YearlySummary = {
  year: number;
  income: number;
  expense: number;
  net: number;
  months: MonthPoint[];
};

export type DayPoint = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

export type DailySummary = {
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  net: number;
  days: DayPoint[];
};

export type AccountBalancePoint = {
  uuid: string;
  name: string;
  type: AccountType;
  bankName: string | null;
  color: string | null;
  balance: number;
};

export type AccountBalanceSummary = {
  totalBalance: number;
  cashBalance: number;
  bankBalance: number;
  accounts: AccountBalancePoint[];
};

export type DebtSummary = {
  receivableOutstanding: number;
  payableOutstanding: number;
  receivableCount: number;
  payableCount: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type TransactionTypeTotal = {
  type: string;
  _sum: { amount: unknown };
};

type CategoryTypeTotal = {
  type: string;
  categoryId: number | null;
  _sum: { amount: unknown };
};

type CategoryLabel = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

/**
 * Mengambil total nilai satu jenis transaksi dari hasil agregasi `groupBy`.
 * @param {TransactionTypeTotal[]} rows - Hasil agregasi transaksi per jenis.
 * @param {string} type - Jenis transaksi yang dicari, misalnya INCOME.
 * @returns {number} Total nilai jenis tersebut, 0 bila tidak ada barisnya.
 */
function getTotalByType(rows: TransactionTypeTotal[], type: string) {
  const row = rows.find(_row => _row.type === type);
  return row ? toAmount(row._sum.amount as Parameters<typeof toAmount>[0]) : 0;
}

/**
 * Menyusun rincian nilai per kategori untuk satu jenis transaksi, lengkap
 * dengan porsinya terhadap total, terurut dari nilai terbesar. Transaksi yang
 * kategorinya sudah dihapus dikelompokkan sebagai `Tanpa Kategori`.
 * @param {CategoryTypeTotal[]} rows - Hasil agregasi transaksi per jenis dan kategori.
 * @param {Map<number, CategoryLabel>} categoryMap - Peta ID kategori ke label tampilannya.
 * @param {'INCOME' | 'EXPENSE'} type - Jenis transaksi yang dirinci.
 * @param {number} grandTotal - Total nilai jenis tersebut sebagai pembagi porsi.
 * @returns {CategoryBreakdown[]} Rincian per kategori terurut menurun berdasarkan total.
 */
function buildCategoryBreakdown(rows: CategoryTypeTotal[], categoryMap: Map<number, CategoryLabel>, type: 'INCOME' | 'EXPENSE', grandTotal: number): CategoryBreakdown[] {
  return rows
    .filter(_row => _row.type === type)
    .map(_row => {
      const category = _row.categoryId ? categoryMap.get(_row.categoryId) : undefined;
      const total = toAmount(_row._sum.amount as Parameters<typeof toAmount>[0]);

      return {
        name: category?.name ?? 'Tanpa Kategori',
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        total,
        share: grandTotal > 0 ? total / grandTotal : 0,
      };
    })
    .sort((_left, _right) => _right.total - _left.total);
}

/**
 * Penyusun ringkasan keuangan yang dipakai dashboard dan halaman laporan.
 * Seluruh method menerima `userId` sebagai penyaring wajib supaya ringkasan
 * antar pengguna tidak pernah tercampur.
 */
class ReportService {
  /**
   * Menyusun ringkasan satu rentang tanggal bebas: total pemasukan,
   * pengeluaran, selisihnya, jumlah transaksi, serta rincian nilai per kategori
   * untuk kedua jenisnya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @returns {Promise<PeriodSummary>} Ringkasan rentang tersebut beserta rincian per kategori.
   */
  async getRangeSummary(userId: number, start: Date, end: Date): Promise<PeriodSummary> {
    const where = { userId, occurredAt: { gte: start, lt: end } };

    const [totals, byCategory, categories] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ['type', 'categoryId'],
        where,
        _sum: { amount: true },
      }),
      prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, icon: true, color: true },
      }),
    ]);

    const income = getTotalByType(totals, 'INCOME');
    const expense = getTotalByType(totals, 'EXPENSE');
    const transactionCount = totals.reduce((_total, _row) => _total + _row._count._all, 0);
    const categoryMap = new Map(categories.map(_category => [_category.id, _category]));

    return {
      income,
      expense,
      net: income - expense,
      transactionCount,
      expenseByCategory: buildCategoryBreakdown(byCategory, categoryMap, 'EXPENSE', expense),
      incomeByCategory: buildCategoryBreakdown(byCategory, categoryMap, 'INCOME', income),
    };
  }

  /**
   * Menyusun ringkasan satu bulan penuh.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {number} year - Tahun periode ringkasan.
   * @param {number} month - Bulan periode ringkasan dengan Januari bernilai 1.
   * @returns {Promise<MonthlySummary>} Ringkasan bulanan beserta rincian per kategori.
   */
  async getMonthlySummary(userId: number, year: number, month: number): Promise<MonthlySummary> {
    const { start, end } = monthRange(year, month);
    const summary = await this.getRangeSummary(userId, start, end);

    return { year, month, ...summary };
  }

  /**
   * Menyusun ringkasan tujuh hari terakhir yang berakhir pada tanggal acuan.
   * Tanggal acuan dikirim pemanggil, bukan dibaca dari jam server, supaya label
   * periode di layar, isi laporan, dan nama berkasnya selalu menunjuk rentang
   * yang sama.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} referenceDate - Tanggal acuan akhir rentang dalam format `YYYY-MM-DD`.
   * @returns {Promise<WeeklySummary>} Ringkasan mingguan beserta batas rentang dan rincian per kategori.
   */
  async getWeeklySummary(userId: number, referenceDate: string): Promise<WeeklySummary> {
    const { start, end } = weekRange(referenceDate);
    const summary = await this.getRangeSummary(userId, start, end);

    return { startDate: toDateInputValue(start), endDate: referenceDate, ...summary };
  }

  /**
   * Menyusun ringkasan dua belas bulan dalam satu tahun. Dikerjakan lewat satu
   * kueri raw karena versi `groupBy` per bulan akan menembak database dua belas
   * kali hanya untuk satu tampilan dashboard.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {number} year - Tahun periode ringkasan.
   * @returns {Promise<YearlySummary>} Ringkasan tahunan beserta titik data tiap bulan.
   */
  async getYearlySummary(userId: number, year: number): Promise<YearlySummary> {
    const { start, end } = yearRange(year);

    const rows = await prisma.$queryRaw<{ month: number; type: string; total: string }[]>`
      SELECT EXTRACT(MONTH FROM "occurredAt")::int AS month,
             "type"::text                          AS type,
             SUM("amount")::text                   AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "occurredAt" >= ${start}
        AND "occurredAt" < ${end}
      GROUP BY 1, 2
    `;

    const months: MonthPoint[] = Array.from({ length: 12 }, (_unused, _index) => ({
      month: _index + 1,
      income: 0,
      expense: 0,
      net: 0,
    }));

    for (const _row of rows) {
      const point = months[_row.month - 1];
      if (!point) continue;

      if (_row.type === 'INCOME') point.income = Number(_row.total);
      else if (_row.type === 'EXPENSE') point.expense = Number(_row.total);
    }

    let income = 0;
    let expense = 0;

    for (const _point of months) {
      _point.net = _point.income - _point.expense;
      income += _point.income;
      expense += _point.expense;
    }

    return { year, income, expense, net: income - expense, months };
  }

  /**
   * Menyusun ringkasan harian tujuh hari terakhir yang berakhir pada tanggal
   * acuan. Dikerjakan lewat satu kueri raw dengan alasan yang sama seperti
   * ringkasan tahunan: satu kueri per hari hanya akan menembak database
   * berkali-kali untuk satu grafik.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {string} referenceDate - Tanggal acuan akhir rentang dalam format `YYYY-MM-DD`.
   * @returns {Promise<DailySummary>} Ringkasan rentang tersebut beserta titik data tiap harinya.
   */
  async getDailySummary(userId: number, referenceDate: string): Promise<DailySummary> {
    const { start, end } = weekRange(referenceDate);

    const rows = await prisma.$queryRaw<{ date: string; type: string; total: string }[]>`
      SELECT to_char("occurredAt", 'YYYY-MM-DD') AS date,
             "type"::text                        AS type,
             SUM("amount")::text                 AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "occurredAt" >= ${start}
        AND "occurredAt" < ${end}
      GROUP BY 1, 2
    `;

    const dayCount = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS);

    const days: DayPoint[] = Array.from({ length: dayCount }, (_unused, _index) => ({
      date: toDateInputValue(new Date(start.getTime() + _index * DAY_IN_MS)),
      income: 0,
      expense: 0,
      net: 0,
    }));

    const dayMap = new Map(days.map(_day => [_day.date, _day]));

    for (const _row of rows) {
      const point = dayMap.get(_row.date);
      if (!point) continue;

      if (_row.type === 'INCOME') point.income = Number(_row.total);
      else if (_row.type === 'EXPENSE') point.expense = Number(_row.total);
    }

    let income = 0;
    let expense = 0;

    for (const _point of days) {
      _point.net = _point.income - _point.expense;
      income += _point.income;
      expense += _point.expense;
    }

    return {
      startDate: toDateInputValue(start),
      endDate: referenceDate,
      income,
      expense,
      net: income - expense,
      days,
    };
  }

  /**
   * Menghitung sisa hutang dan piutang yang masih berstatus OPEN, beserta
   * jumlah catatannya masing-masing.
   * @param {number} userId - ID pengguna pemilik catatan.
   * @returns {Promise<DebtSummary>} Sisa nilai dan jumlah catatan hutang serta piutang.
   */
  async getDebtSummary(userId: number): Promise<DebtSummary> {
    const debts = await prisma.debt.findMany({
      where: { userId, status: 'OPEN' },
      select: {
        type: true,
        amount: true,
        payments: { select: { amount: true } },
      },
    });

    const summary: DebtSummary = {
      receivableOutstanding: 0,
      payableOutstanding: 0,
      receivableCount: 0,
      payableCount: 0,
    };

    for (const _debt of debts) {
      const paidAmount = _debt.payments.reduce((_total, _payment) => _total + toAmount(_payment.amount), 0);
      const remaining = Math.max(toAmount(_debt.amount) - paidAmount, 0);

      if (_debt.type === 'RECEIVABLE') {
        summary.receivableOutstanding += remaining;
        summary.receivableCount += 1;
      } else {
        summary.payableOutstanding += remaining;
        summary.payableCount += 1;
      }
    }

    return summary;
  }

  /**
   * Menyusun posisi saldo seluruh akun aktif milik pengguna: saldo total,
   * pemisahan tunai dan bank, serta saldo tiap akunnya. Saldo dibaca dari kolom
   * `balance` yang sudah dimutakhirkan tiap transaksi, bukan dijumlahkan ulang
   * dari transaksi, supaya saldo awal akun ikut terhitung.
   * @param {number} userId - ID pengguna pemilik akun.
   * @returns {Promise<AccountBalanceSummary>} Saldo total, saldo per jenis akun, dan saldo tiap akun.
   */
  async getAccountBalanceSummary(userId: number): Promise<AccountBalanceSummary> {
    const rows = await prisma.account.findMany({
      where: { userId, isActive: true },
      select: { uuid: true, name: true, type: true, bankName: true, color: true, balance: true },
      orderBy: [{ balance: 'desc' }, { name: 'asc' }],
    });

    const accounts: AccountBalancePoint[] = rows.map(_row => ({
      uuid: _row.uuid,
      name: _row.name,
      type: _row.type,
      bankName: _row.bankName,
      color: _row.color,
      balance: toAmount(_row.balance),
    }));

    let cashBalance = 0;
    let bankBalance = 0;

    for (const _account of accounts) {
      if (_account.type === 'BANK') bankBalance += _account.balance;
      else cashBalance += _account.balance;
    }

    return {
      totalBalance: cashBalance + bankBalance,
      cashBalance,
      bankBalance,
      accounts,
    };
  }

  /**
   * Mengambil beberapa transaksi terbaru milik pengguna untuk kartu ringkas di
   * dashboard.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {number} limit - Jumlah transaksi yang diambil, default 5.
   * @returns {Promise<TransactionDTO[]>} Daftar transaksi terbaru.
   */
  async getRecentTransactions(userId: number, limit = 5): Promise<TransactionDTO[]> {
    const page = await transactionService.list(userId, { limit });
    return page.items;
  }

  /**
   * Mengambil beberapa transaksi terbaru pada satu rentang tanggal, dipakai
   * kartu dashboard yang periodenya tidak jatuh tepat pada batas bulan.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {Date} start - Awal rentang sebagai batas inklusif.
   * @param {Date} end - Akhir rentang sebagai batas eksklusif.
   * @param {number} limit - Jumlah transaksi yang diambil, default 5.
   * @returns {Promise<TransactionDTO[]>} Daftar transaksi terbaru pada rentang tersebut.
   */
  async getRecentTransactionsInRange(userId: number, start: Date, end: Date, limit = 5): Promise<TransactionDTO[]> {
    return transactionService.listInRange(userId, start, end, limit);
  }
}

export const reportService = new ReportService();
