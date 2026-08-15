import Link from 'next/link';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { reportService, type CategoryBreakdown } from '@/src/lib/reports/ReportService';
import type { TransactionDTO } from '@/src/lib/transactions/TransactionService';
import { formatDateID, formatWeekdayShortID, monthLabel, MONTH_NAMES_ID, resolvePeriod, resolveScope, toDateInputValue, weekLabel, weekRange } from '@/src/helpers/DateHelper';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Money } from '@/src/components/ui/Money';
import { EmptyState } from '@/src/components/ui/EmptyState';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import PeriodSwitcher from './PeriodSwitcher';
import ScopeSwitcher from './ScopeSwitcher';
import TrendChart, { type TrendPoint } from './TrendChart';
import AccountBalanceChart from './AccountBalanceChart';

const RECENT_TRANSACTION_LIMIT = 6;

type DashboardPageOwnProps = {
  searchParams: Promise<{ year?: string; month?: string; scope?: string }>;
};

type DashboardPeriod = {
  subtitle: string;
  netLabel: string;
  trendTitle: string;
  recentTitle: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  expenseByCategory: CategoryBreakdown[];
  points: TrendPoint[];
  recent: TransactionDTO[];
};

/**
 * Menyiapkan seluruh isi dashboard untuk cakupan bulanan: ringkasan bulan
 * terpilih, tren dua belas bulan sebagai grafiknya, dan transaksi terakhir.
 * @param {number} userId - ID pengguna pemilik data.
 * @param {number} year - Tahun periode yang dipilih.
 * @param {number} month - Bulan periode yang dipilih dengan Januari bernilai 1.
 * @returns {Promise<DashboardPeriod>} Isi dashboard untuk cakupan bulanan.
 */
async function getMonthlyPeriod(userId: number, year: number, month: number): Promise<DashboardPeriod> {
  const [summary, yearly, recent] = await Promise.all([
    reportService.getMonthlySummary(userId, year, month),
    reportService.getYearlySummary(userId, year),
    reportService.getRecentTransactions(userId, RECENT_TRANSACTION_LIMIT),
  ]);

  return {
    subtitle: monthLabel(year, month),
    netLabel: 'Selisih bulan ini',
    trendTitle: `Tren ${year}`,
    recentTitle: 'Transaksi Terakhir',
    income: summary.income,
    expense: summary.expense,
    net: summary.net,
    transactionCount: summary.transactionCount,
    expenseByCategory: summary.expenseByCategory,
    points: yearly.months.map(_point => ({
      key: `month_${_point.month}`,
      label: MONTH_NAMES_ID[_point.month - 1].slice(0, 3),
      title: monthLabel(year, _point.month),
      income: _point.income,
      expense: _point.expense,
      isActive: _point.month === month,
    })),
    recent,
  };
}

/**
 * Menyiapkan seluruh isi dashboard untuk cakupan tujuh hari terakhir: ringkasan
 * rentangnya, tren per hari sebagai grafiknya, dan transaksi yang jatuh di
 * dalam rentang tersebut.
 * @param {number} userId - ID pengguna pemilik data.
 * @param {string} referenceDate - Tanggal acuan akhir rentang dalam format `YYYY-MM-DD`.
 * @returns {Promise<DashboardPeriod>} Isi dashboard untuk cakupan mingguan.
 */
async function getWeeklyPeriod(userId: number, referenceDate: string): Promise<DashboardPeriod> {
  const { start, end } = weekRange(referenceDate);

  const [summary, daily, recent] = await Promise.all([
    reportService.getWeeklySummary(userId, referenceDate),
    reportService.getDailySummary(userId, referenceDate),
    reportService.getRecentTransactionsInRange(userId, start, end, RECENT_TRANSACTION_LIMIT),
  ]);

  return {
    subtitle: `7 hari terakhir · ${weekLabel(referenceDate)}`,
    netLabel: 'Selisih 7 hari',
    trendTitle: 'Tren 7 Hari Terakhir',
    recentTitle: 'Transaksi 7 Hari Terakhir',
    income: summary.income,
    expense: summary.expense,
    net: summary.net,
    transactionCount: summary.transactionCount,
    expenseByCategory: summary.expenseByCategory,
    points: daily.days.map(_point => ({
      key: `day_${_point.date}`,
      label: formatWeekdayShortID(_point.date),
      title: formatDateID(_point.date),
      income: _point.income,
      expense: _point.expense,
      isActive: _point.date === referenceDate,
    })),
    recent,
  };
}

/**
 * Halaman ringkasan keuangan: posisi saldo seluruh akun, selisih periode
 * berjalan, tren periodenya, posisi hutang dan piutang, rincian pengeluaran per
 * kategori, serta transaksi terakhir. Cakupan periodenya dapat ditukar antara
 * bulanan dan tujuh hari terakhir, dan seluruh ringkasannya diambil serentak
 * supaya halaman tidak menunggu kueri satu per satu.
 * @param {DashboardPageOwnProps} props - Props halaman.
 * @param {Promise<{ year?: string; month?: string; scope?: string }>} props.searchParams - Periode dan cakupan yang diminta lewat query string.
 * @returns {ReactNode} Halaman ringkasan keuangan.
 */
export default async function DashboardPage({ searchParams }: DashboardPageOwnProps) {
  const user = await requireAuthUser();
  const params = await searchParams;
  const { year, month } = resolvePeriod(params);
  const scope = resolveScope(params.scope);
  const referenceDate = toDateInputValue(new Date());

  const [period, debts, balance] = await Promise.all([
    scope === 'weekly' ? getWeeklyPeriod(user.id, referenceDate) : getMonthlyPeriod(user.id, year, month),
    reportService.getDebtSummary(user.id),
    reportService.getAccountBalanceSummary(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ringkasan" subtitle={period.subtitle}>
        <ScopeSwitcher scope={scope} basePath="/dashboard" />
        {scope === 'monthly' && <PeriodSwitcher year={year} month={month} basePath="/dashboard" />}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">{period.netLabel}</p>
          <p className="mt-1 text-2xl font-bold lg:text-3xl">
            <Money value={period.net} tone="auto" />
          </p>
          <p className="mt-1 text-[11px] text-gray-400">dari {period.transactionCount} transaksi</p>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <DynamicIcon icon="ph:arrow-down-left" fontSize="14px" />
            <p className="text-xs font-semibold">Pemasukan</p>
          </div>
          <p className="mt-1.5 text-base font-bold sm:text-lg lg:text-xl">
            <Money value={period.income} tone="income" />
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-red-500">
            <DynamicIcon icon="ph:arrow-up-right" fontSize="14px" />
            <p className="text-xs font-semibold">Pengeluaran</p>
          </div>
          <p className="mt-1.5 text-base font-bold sm:text-lg lg:text-xl">
            <Money value={period.expense} tone="expense" />
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500">Saldo total</p>
            <p className="mt-1 text-2xl font-bold lg:text-3xl">
              <Money value={balance.totalBalance} />
            </p>
            <p className="mt-1 text-[11px] text-gray-400">dari {balance.accounts.length} akun aktif</p>
          </div>

          <dl className="mt-auto flex flex-col gap-2 border-t border-gray-100 pt-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <DynamicIcon icon="ph:money" fontSize="14px" />
                Tunai
              </dt>
              <dd className="font-bold">
                <Money value={balance.cashBalance} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <DynamicIcon icon="ph:bank" fontSize="14px" />
                Bank
              </dt>
              <dd className="font-bold">
                <Money value={balance.bankBalance} />
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle
            title="Saldo per Akun"
            action={
              <Link href="/profile" className="text-xs font-semibold text-gray-500 hover:underline">
                Kelola akun
              </Link>
            }
          />
          {balance.accounts.length === 0 ? (
            <EmptyState icon="ph:wallet" title="Belum ada akun aktif" description="Tambahkan akun tunai atau bank dari halaman profil untuk melihat sebaran saldonya di sini." />
          ) : (
            <AccountBalanceChart accounts={balance.accounts} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            title={period.trendTitle}
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
          <TrendChart points={period.points} />
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
          {period.expenseByCategory.length === 0 ? (
            <EmptyState icon="ph:chart-pie-slice" title="Belum ada pengeluaran" description="Kategori akan muncul di sini setelah ada transaksi keluar." />
          ) : (
            <ul className="flex flex-col gap-3">
              {period.expenseByCategory.slice(0, 6).map(_item => (
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
            title={period.recentTitle}
            action={
              <Link href="/transactions" className="text-xs font-semibold text-gray-500 hover:underline">
                Lihat semua
              </Link>
            }
          />

          {period.recent.length === 0 ? (
            <EmptyState icon="ph:receipt" title="Belum ada transaksi" description="Tambahkan pemasukan atau pengeluaran pertama Anda dari menu Transaksi." />
          ) : (
            <ul className="flex flex-col divide-y divide-gray-50">
              {period.recent.map(_transaction => (
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
