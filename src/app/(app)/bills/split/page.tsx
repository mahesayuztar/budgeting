import Link from 'next/link';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Card } from '@/src/components/ui/Card';
import { Money } from '@/src/components/ui/Money';
import PeriodSwitcher from '@/src/app/(app)/dashboard/PeriodSwitcher';
import { monthLabel, resolvePeriod } from '@/src/helpers/DateHelper';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import SplitBillHistory from './SplitBillHistory';

type SplitBillsPageOwnProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

/** Halaman history Bagi Tagihan untuk periode aktif. */
export default async function SplitBillsPage({ searchParams }: SplitBillsPageOwnProps) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);
  const [initialPage, summary] = await Promise.all([splitBillService.list(user.id, { year, month }), splitBillService.summarize(user.id, { year, month })]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Bagi Tagihan</h2>
          <p className="text-xs text-gray-400">{monthLabel(year, month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSwitcher year={year} month={month} basePath="/bills/split" />
          <Link
            href="/bills/split/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-theme-primary px-4 py-2 text-sm font-bold text-gray-800 shadow-md shadow-theme-primary/30 hover:bg-theme-secondary"
          >
            <DynamicIcon icon="ph:plus" fontSize="16px" />
            Buat baru
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">Total terbagi</p>
          <p className="mt-1 text-xl font-bold">
            <Money value={summary.total} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Tagihan</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{summary.count}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Draft</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{summary.draftCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Final</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{summary.finalizedCount}</p>
        </Card>
      </div>

      <Card>
        <SplitBillHistory year={year} month={month} initialPage={initialPage} />
      </Card>
    </div>
  );
}
