import { requireAuthUser } from "@/src/core/auth/dal";
import { transactionService } from "@/src/core/transactions/services/transaction.service";
import { categoryService } from "@/src/core/categories/services/category.service";
import { currentPeriod, formatDateID, monthLabel } from "@/src/core/lib/date";
import { Card } from "@/src/core/components/ui/card";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import { Money } from "@/src/core/components/ui/money";
import PeriodSwitcher from "../dashboard/period-switcher";
import TransactionForm from "./transaction-form";
import TransactionItem from "./transaction-item";
import type { TransactionDTO } from "@/src/core/transactions/services/transaction.service";

type SearchParams = Promise<{ year?: string; month?: string }>;

function resolvePeriod(raw: { year?: string; month?: string }) {
  const fallback = currentPeriod();
  const year = Number(raw.year);
  const month = Number(raw.month);

  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
  };
}

function groupByDate(transactions: TransactionDTO[]) {
  const groups = new Map<string, TransactionDTO[]>();

  for (const transaction of transactions) {
    const list = groups.get(transaction.occurredAt) ?? [];
    list.push(transaction);
    groups.set(transaction.occurredAt, list);
  }

  return [...groups.entries()];
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  const [transactions, categories] = await Promise.all([
    transactionService.list(user.id, { year, month, limit: 200 }),
    categoryService.list(user.id),
  ]);

  const groups = groupByDate(transactions);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Transaksi</h1>
          <p className="text-xs text-gray-400">{monthLabel(year, month)}</p>
        </div>
        <PeriodSwitcher year={year} month={month} basePath="/transactions" />
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon="ph:receipt"
            title="Belum ada transaksi"
            description={`Tidak ada catatan pada ${monthLabel(year, month)}. Tekan tombol + untuk menambah.`}
          />
        </Card>
      ) : (
        groups.map(([date, items]) => {
          const dayTotal = items.reduce(
            (total, item) =>
              total + (item.type === "INCOME" ? item.amount : -item.amount),
            0,
          );

          return (
            <Card key={date}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">{formatDateID(date)}</p>
                <p className="text-xs font-semibold">
                  <Money value={dayTotal} tone="auto" />
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-gray-50">
                {items.map((transaction) => (
                  <TransactionItem key={transaction.uuid} transaction={transaction} />
                ))}
              </ul>
            </Card>
          );
        })
      )}

      <TransactionForm categories={categories} />
    </div>
  );
}
