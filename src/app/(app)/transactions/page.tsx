import { requireAuthUser } from "@/src/core/auth/dal";
import { transactionService } from "@/src/core/transactions/services/transaction.service";
import { categoryService } from "@/src/core/categories/services/category.service";
import { currentPeriod, formatDateID, monthLabel } from "@/src/core/lib/date";
import { Card } from "@/src/core/components/ui/card";
import { PageHeader } from "@/src/core/components/ui/page-header";
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

  const income = transactions
    .filter((item) => item.type === "INCOME")
    .reduce((total, item) => total + item.amount, 0);
  const expense = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((total, item) => total + item.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Transaksi" subtitle={monthLabel(year, month)}>
        <PeriodSwitcher year={year} month={month} basePath="/transactions" />
        <TransactionForm categories={categories} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">
            Selisih · {transactions.length} transaksi
          </p>
          <p className="mt-1 text-xl font-bold sm:text-lg lg:text-xl">
            <Money value={income - expense} tone="auto" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Pemasukan</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={income} tone="income" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Pengeluaran</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={expense} tone="expense" />
          </p>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon="ph:receipt"
            title="Belum ada transaksi"
            description={`Tidak ada catatan pada ${monthLabel(year, month)}. Gunakan tombol Tambah Transaksi untuk mengisi.`}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map(([date, items]) => {
            const dayTotal = items.reduce(
              (total, item) =>
                total + (item.type === "INCOME" ? item.amount : -item.amount),
              0,
            );

            return (
              <Card key={date}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700">
                    {formatDateID(date)}
                  </p>
                  <p className="text-xs font-semibold">
                    <Money value={dayTotal} tone="auto" />
                  </p>
                </div>
                <ul className="flex flex-col divide-y divide-gray-50">
                  {items.map((transaction) => (
                    <TransactionItem
                      key={transaction.uuid}
                      transaction={transaction}
                    />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
