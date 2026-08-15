import Link from 'next/link';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { reportService } from '@/src/lib/reports/ReportService';
import { formatDateID, monthLabel, resolvePeriod } from '@/src/helpers/DateHelper';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Money } from '@/src/components/ui/Money';
import { EmptyState } from '@/src/components/ui/EmptyState';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import PeriodSwitcher from './PeriodSwitcher';
import YearChart from './YearChart';

type DashboardPageOwnProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

/**
 * Halaman ringkasan keuangan: selisih bulan berjalan, tren dua belas bulan,
 * posisi hutang dan piutang, rincian pengeluaran per kategori, serta transaksi
 * terakhir. Seluruh ringkasannya diambil serentak supaya halaman tidak menunggu
 * kueri satu per satu.
 * @param {DashboardPageOwnProps} props - Props halaman.
 * @param {Promise<{ year?: string; month?: string }>} props.searchParams - Periode yang diminta lewat query string.
 * @returns {ReactNode} Halaman ringkasan keuangan.
 */
export default async function DashboardPage({ searchParams }: DashboardPageOwnProps) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  const [summary, yearly, debts, recent] = await Promise.all([
    reportService.getMonthlySummary(user.id, year, month),
    reportService.getYearlySummary(user.id, year),
    reportService.getDebtSummary(user.id),
    reportService.getRecentTransactions(user.id, 6),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ringkasan" subtitle={monthLabel(year, month)}>
        <PeriodSwitcher year={year} month={month} basePath="/dashboard" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">Selisih bulan ini</p>
          <p className="mt-1 text-2xl font-bold lg:text-3xl">
            <Money value={summary.net} tone="auto" />
          </p>
          <p className="mt-1 text-[11px] text-gray-400">dari {summary.transactionCount} transaksi</p>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <DynamicIcon icon="ph:arrow-down-left" fontSize="14px" />
            <p className="text-xs font-semibold">Pemasukan</p>
          </div>
          <p className="mt-1.5 text-base font-bold sm:text-lg lg:text-xl">
            <Money value={summary.income} tone="income" />
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-red-500">
            <DynamicIcon icon="ph:arrow-up-right" fontSize="14px" />
            <p className="text-xs font-semibold">Pengeluaran</p>
          </div>
          <p className="mt-1.5 text-base font-bold sm:text-lg lg:text-xl">
            <Money value={summary.expense} tone="expense" />
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            title={`Tren ${year}`}
            action={
              <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-emerald-400/80" /> Masuk
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-red-300" /> Keluar
                </span>
              </div>
            }
          />
          <YearChart months={yearly.months} activeMonth={month} />
        </Card>

        <Card>
          <SectionTitle
            title="Hutang & Piutang"
            action={
              <Link href="/debts" className="text-xs font-semibold text-gray-500 hover:underline">
                Lihat semua
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] font-semibold text-emerald-700">Piutang ({debts.receivableCount})</p>
              <p className="mt-1 text-sm font-bold">
                <Money value={debts.receivableOutstanding} tone="income" />
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-[11px] font-semibold text-red-600">Hutang ({debts.payableCount})</p>
              <p className="mt-1 text-sm font-bold">
                <Money value={debts.payableOutstanding} tone="expense" />
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle title="Pengeluaran per Kategori" />
          {summary.expenseByCategory.length === 0 ? (
            <EmptyState icon="ph:chart-pie-slice" title="Belum ada pengeluaran" description="Kategori akan muncul di sini setelah ada transaksi keluar." />
          ) : (
            <ul className="flex flex-col gap-3">
              {summary.expenseByCategory.slice(0, 6).map(_item => (
                <li key={`dashboard__expense_category_${_item.name}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate font-semibold text-gray-700">{_item.name}</span>
                    <span className="shrink-0 text-gray-500">
                      <Money value={_item.total} />
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(_item.share * 100, 2)}%`,
                        backgroundColor: _item.color ?? 'var(--color-theme-primary)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle
            title="Transaksi Terakhir"
            action={
              <Link href="/transactions" className="text-xs font-semibold text-gray-500 hover:underline">
                Lihat semua
              </Link>
            }
          />

          {recent.length === 0 ? (
            <EmptyState icon="ph:receipt" title="Belum ada transaksi" description="Tambahkan pemasukan atau pengeluaran pertama Anda dari menu Transaksi." />
          ) : (
            <ul className="flex flex-col divide-y divide-gray-50">
              {recent.map(_transaction => (
                <li key={`dashboard__recent_transaction_${_transaction.uuid}`} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700"
                    style={{ backgroundColor: _transaction.category?.color ?? '#F1F1F1' }}
                  >
                    <DynamicIcon icon={_transaction.category?.icon ?? 'ph:circle-dashed'} fontSize="16px" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{_transaction.category?.name ?? 'Tanpa Kategori'}</p>
                    <p className="truncate text-[11px] text-gray-400">
                      {formatDateID(_transaction.occurredAt)}
                      {_transaction.note ? ` · ${_transaction.note}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    <Money value={_transaction.amount} tone={_transaction.type === 'INCOME' ? 'income' : 'expense'} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
