import 'server-only';

import { prisma } from '@/src/lib/Prisma';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { monthRange, yearRange } from '@/src/helpers/DateHelper';
import { transactionService, type TransactionDTO } from '@/src/lib/transactions/TransactionService';

export type CategoryBreakdown = {
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  share: number;
};

export type MonthlySummary = {
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
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

export type DebtSummary = {
  receivableOutstanding: number;
  payableOutstanding: number;
  receivableCount: number;
  payableCount: number;
};

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
   * Menyusun ringkasan satu bulan: total pemasukan, pengeluaran, selisihnya,
   * jumlah transaksi, serta rincian nilai per kategori untuk kedua jenisnya.
   * @param {number} userId - ID pengguna pemilik transaksi.
   * @param {number} year - Tahun periode ringkasan.
   * @param {number} month - Bulan periode ringkasan dengan Januari bernilai 1.
   * @returns {Promise<MonthlySummary>} Ringkasan bulanan beserta rincian per kategori.
   */
  async getMonthlySummary(userId: number, year: number, month: number): Promise<MonthlySummary> {
    const { start, end } = monthRange(year, month);
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
      year,
      month,
      income,
      expense,
      net: income - expense,
      transactionCount,
      expenseByCategory: buildCategoryBreakdown(byCategory, categoryMap, 'EXPENSE', expense),
      incomeByCategory: buildCategoryBreakdown(byCategory, categoryMap, 'INCOME', income),
    };
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
      else point.expense = Number(_row.total);
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
}

export const reportService = new ReportService();
