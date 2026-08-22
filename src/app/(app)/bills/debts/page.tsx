import Link from 'next/link';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { debtService } from '@/src/lib/debts/DebtService';
import { reportService } from '@/src/lib/reports/ReportService';
import { accountService } from '@/src/lib/accounts/AccountService';
import { Card } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Money } from '@/src/components/ui/Money';
import DebtsTable from '@/src/app/(app)/debts/DebtsTable';
import DebtForm from '@/src/app/(app)/debts/DebtForm';

const DEBT_TABS = [
  { value: 'PAYABLE', label: 'Hutang Saya' },
  { value: 'RECEIVABLE', label: 'Piutang Saya' },
] as const;

type BillsDebtsPageOwnProps = { searchParams: Promise<{ type?: string }> };

/** Menampilkan fitur debt existing di dalam submenu hub Tagihan. */
export default async function BillsDebtsPage({ searchParams }: BillsDebtsPageOwnProps) {
  const user = await requireAuthUser();
  const { type: rawType } = await searchParams;
  const activeType = rawType === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE';
  const [initialPage, summary, accounts] = await Promise.all([
    debtService.list(user.id, { type: activeType }),
    reportService.getDebtSummary(user.id),
    accountService.list(user.id),
  ]);
  const outstanding = activeType === 'RECEIVABLE' ? summary.receivableOutstanding : summary.payableOutstanding;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Hutang & Piutang" subtitle="Catat pinjaman masuk dan keluar">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          {DEBT_TABS.map(_tab => (
            <Link
              key={`bills_debts__tab_${_tab.value}`}
              href={`/bills/debts?type=${_tab.value}`}
              className={`rounded-lg px-4 py-2 text-center text-sm font-bold transition-colors ${
                activeType === _tab.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {_tab.label}
            </Link>
          ))}
        </div>
        <DebtForm accounts={accounts} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">{activeType === 'RECEIVABLE' ? 'Piutang' : 'Hutang'} belum lunas</p>
          <p className="mt-1 text-xl font-bold sm:text-lg lg:text-xl">
            <Money value={outstanding} tone={activeType === 'RECEIVABLE' ? 'income' : 'expense'} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Total Piutang ({summary.receivableCount})</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.receivableOutstanding} tone="income" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Total Hutang ({summary.payableCount})</p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.payableOutstanding} tone="expense" />
          </p>
        </Card>
      </div>

      <Card>
        <DebtsTable type={activeType} initialPage={initialPage} accounts={accounts} />
      </Card>
    </div>
  );
}
