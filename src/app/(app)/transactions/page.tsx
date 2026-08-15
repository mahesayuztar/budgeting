import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { transactionService } from '@/src/lib/transactions/TransactionService';
import { categoryService } from '@/src/lib/categories/CategoryService';
import { accountService } from '@/src/lib/accounts/AccountService';
import { reportService } from '@/src/lib/reports/ReportService';
import { monthLabel, resolvePeriod } from '@/src/helpers/DateHelper';
import { Card } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Money } from '@/src/components/ui/Money';
import PeriodSwitcher from '@/src/app/(app)/dashboard/PeriodSwitcher';
import TransactionForm from './TransactionForm';
import TransactionsTable from './TransactionsTable';

type TransactionsPageOwnProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

/**
 * Halaman daftar transaksi satu periode beserta kartu ringkasannya. Angka pada
 * kartu dihitung dari agregasi database, bukan dari baris yang sedang termuat,
 * karena dengan gulir tak hingga hanya sebagian baris yang ada di klien.
 * @param {TransactionsPageOwnProps} props - Props halaman.
 * @param {Promise<{ year?: string; month?: string }>} props.searchParams - Periode yang diminta lewat query string.
 * @returns {ReactNode} Halaman daftar transaksi.
 */
export default async function TransactionsPage({ searchParams }: TransactionsPageOwnProps) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

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
          <p className="text-xs font-semibold text-gray-500">Selisih · {summary.transactionCount} transaksi</p>
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
