import { requireAuthUser } from "@/src/core/auth/dal";
import { transactionService } from "@/src/core/transactions/services/transaction.service";
import { categoryService } from "@/src/core/categories/services/category.service";
import { reportService } from "@/src/core/reports/services/report.service";
import { currentPeriod, monthLabel } from "@/src/core/lib/date";
import { Card } from "@/src/core/components/ui/card";
import { PageHeader } from "@/src/core/components/ui/page-header";
import { Money } from "@/src/core/components/ui/money";
import PeriodSwitcher from "../dashboard/period-switcher";
import TransactionForm from "./transaction-form";
import TransactionsTable from "./transactions-table";
import { accountService } from "@/src/core/accounts/services/account.service";

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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  // Total dihitung dari agregasi database, bukan dari baris yang termuat —
  // dengan infinite scroll hanya sebagian baris ada di klien.
  const [initialPage, categories, accounts, summary] = await Promise.all([
    transactionService.list(user.id, { year, month }),
    categoryService.list(user.id),
    accountService.list(user.id),
    reportService.getMonthlySummary(user.id, year, month),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Transaksi" subtitle={monthLabel(year, month)}>
        <PeriodSwitcher year={year} month={month} basePath="/transactions" />
        <TransactionForm categories={categories} accounts={accounts} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">
            Selisih · {summary.transactionCount} transaksi
          </p>
          <p className="mt-1 text-xl font-bold sm:text-lg lg:text-xl">
            <Money value={summary.net} tone="auto" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Pemasukan</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.income} tone="income" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Pengeluaran</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.expense} tone="expense" />
          </p>
        </Card>
      </div>

      <Card>
        <TransactionsTable year={year} month={month} initialPage={initialPage} />
      </Card>
    </div>
  );
}
