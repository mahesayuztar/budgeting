import "server-only";

import { prisma } from "@/src/core/lib/prisma";
import { toAmount } from "@/src/core/lib/money";
import { monthRange, yearRange } from "@/src/core/lib/date";
import {
  transactionService,
  type TransactionDTO,
} from "@/src/core/transactions/services/transaction.service";

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

class ReportService {
  async getMonthlySummary(
    userId: number,
    year: number,
    month: number,
  ): Promise<MonthlySummary> {
    const { start, end } = monthRange(year, month);
    const where = { userId, occurredAt: { gte: start, lt: end } };

    const [totals, byCategory, categories] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ["type", "categoryId"],
        where,
        _sum: { amount: true },
      }),
      prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, icon: true, color: true },
      }),
    ]);

    const income = sumFor(totals, "INCOME");
    const expense = sumFor(totals, "EXPENSE");
    const transactionCount = totals.reduce(
      (total, row) => total + row._count._all,
      0,
    );

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const build = (type: "INCOME" | "EXPENSE", grandTotal: number) =>
      byCategory
        .filter((row) => row.type === type)
        .map((row) => {
          const category = row.categoryId
            ? categoryMap.get(row.categoryId)
            : undefined;
          const total = toAmount(row._sum.amount);

          return {
            name: category?.name ?? "Tanpa Kategori",
            icon: category?.icon ?? null,
            color: category?.color ?? null,
            total,
            share: grandTotal > 0 ? total / grandTotal : 0,
          };
        })
        .sort((a, b) => b.total - a.total);

    return {
      year,
      month,
      income,
      expense,
      net: income - expense,
      transactionCount,
      expenseByCategory: build("EXPENSE", expense),
      incomeByCategory: build("INCOME", income),
    };
  }

  /**
   * Satu query raw untuk 12 bulan sekaligus — versi `groupBy` per bulan akan
   * menembak database 12 kali untuk satu tampilan dashboard.
   */
  async getYearlySummary(userId: number, year: number): Promise<YearlySummary> {
    const { start, end } = yearRange(year);

    const rows = await prisma.$queryRaw<
      { month: number; type: string; total: string }[]
    >`
      SELECT EXTRACT(MONTH FROM "occurredAt")::int AS month,
             "type"::text                          AS type,
             SUM("amount")::text                   AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "occurredAt" >= ${start}
        AND "occurredAt" < ${end}
      GROUP BY 1, 2
    `;

    const months: MonthPoint[] = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: 0,
      expense: 0,
      net: 0,
    }));

    for (const row of rows) {
      const point = months[row.month - 1];
      if (!point) continue;

      if (row.type === "INCOME") point.income = Number(row.total);
      else point.expense = Number(row.total);
    }

    let income = 0;
    let expense = 0;

    for (const point of months) {
      point.net = point.income - point.expense;
      income += point.income;
      expense += point.expense;
    }

    return { year, income, expense, net: income - expense, months };
  }

  async getDebtSummary(userId: number): Promise<DebtSummary> {
    const debts = await prisma.debt.findMany({
      where: { userId, status: "OPEN" },
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

    for (const debt of debts) {
      const paid = debt.payments.reduce(
        (total, payment) => total + toAmount(payment.amount),
        0,
      );
      const remaining = Math.max(toAmount(debt.amount) - paid, 0);

      if (debt.type === "RECEIVABLE") {
        summary.receivableOutstanding += remaining;
        summary.receivableCount += 1;
      } else {
        summary.payableOutstanding += remaining;
        summary.payableCount += 1;
      }
    }

    return summary;
  }

  getRecentTransactions(userId: number, limit = 5): Promise<TransactionDTO[]> {
    return transactionService.list(userId, { limit });
  }
}

function sumFor(
  rows: { type: string; _sum: { amount: unknown } }[],
  type: string,
) {
  const row = rows.find((item) => item.type === type);
  return row ? toAmount(row._sum.amount as never) : 0;
}

export const reportService = new ReportService();
