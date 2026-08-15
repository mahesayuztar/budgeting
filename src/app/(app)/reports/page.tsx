import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { reportService } from '@/src/lib/reports/ReportService';
import { monthLabel, MONTH_NAMES_ID, resolvePeriod } from '@/src/helpers/DateHelper';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Money } from '@/src/components/ui/Money';
import PeriodSwitcher from '@/src/app/(app)/dashboard/PeriodSwitcher';
import ReportPanel from './ReportPanel';

type ReportsPageOwnProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

/**
 * Halaman laporan: pratinjau dan unduh rekap PDF, ringkasan periode terpilih,
 * serta rekap dua belas bulan dalam satu tahun. Kolom kartu diberi `min-w-0`
 * supaya grid boleh menyusut dan tabelnya tetap dapat digulir di layar sempit.
 * @param {ReportsPageOwnProps} props - Props halaman.
 * @param {Promise<{ year?: string; month?: string }>} props.searchParams - Periode yang diminta lewat query string.
 * @returns {ReactNode} Halaman laporan keuangan.
 */
export default async function ReportsPage({ searchParams }: ReportsPageOwnProps) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  const [monthly, yearly] = await Promise.all([reportService.getMonthlySummary(user.id, year, month), reportService.getYearlySummary(user.id, year)]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Laporan" subtitle="Pratinjau dan unduh rekap PDF">
        <PeriodSwitcher year={year} month={month} basePath="/reports" />
      </PageHeader>

      <div className="grid flex-1 gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <SectionTitle title="Pratinjau & Unduh Laporan" />
          <ReportPanel year={year} month={month} />
        </Card>

        <Card className="min-w-0">
          <SectionTitle title={`Ringkasan ${monthLabel(year, month)}`} />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Pemasukan</dt>
              <dd className="font-bold">
                <Money value={monthly.income} tone="income" />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Pengeluaran</dt>
              <dd className="font-bold">
                <Money value={monthly.expense} tone="expense" />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <dt className="font-semibold text-gray-700">Selisih</dt>
              <dd className="font-bold">
                <Money value={monthly.net} tone="auto" />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Jumlah transaksi</dt>
              <dd className="font-semibold text-gray-700">{monthly.transactionCount}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <SectionTitle title={`Rekap ${year}`} />
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="py-2 font-semibold">Bulan</th>
                <th className="py-2 text-right font-semibold">Masuk</th>
                <th className="py-2 text-right font-semibold">Keluar</th>
                <th className="py-2 text-right font-semibold">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {yearly.months.map(_point => (
                <tr key={`reports_page__month_${_point.month}`}>
                  <td className="py-2 text-xs font-semibold text-gray-600">
                    <span className="sm:hidden">{MONTH_NAMES_ID[_point.month - 1].slice(0, 3)}</span>
                    <span className="hidden sm:inline">{MONTH_NAMES_ID[_point.month - 1]}</span>
                  </td>
                  <td className="py-2 text-right text-xs">
                    <Money value={_point.income} tone="income" />
                  </td>
                  <td className="py-2 text-right text-xs">
                    <Money value={_point.expense} tone="expense" />
                  </td>
                  <td className="py-2 text-right text-xs font-semibold">
                    <Money value={_point.net} tone="auto" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-2 text-xs font-bold text-gray-700">Total</td>
                <td className="py-2 text-right text-xs font-bold">
                  <Money value={yearly.income} tone="income" />
                </td>
                <td className="py-2 text-right text-xs font-bold">
                  <Money value={yearly.expense} tone="expense" />
                </td>
                <td className="py-2 text-right text-xs font-bold">
                  <Money value={yearly.net} tone="auto" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
