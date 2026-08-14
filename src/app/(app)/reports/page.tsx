import { requireAuthUser } from "@/src/core/auth/dal";
import { reportService } from "@/src/core/reports/services/report.service";
import { currentPeriod, monthLabel, MONTH_NAMES_ID } from "@/src/core/lib/date";
import { Card, SectionTitle } from "@/src/core/components/ui/card";
import { Money } from "@/src/core/components/ui/money";
import PeriodSwitcher from "../dashboard/period-switcher";
import ReportPanel from "./report-panel";

type SearchParams = Promise<{ year?: string; month?: string }>;

function resolvePeriod(raw: { year?: string; month?: string }) {
  const fallback = currentPeriod();
  const year = Number(raw.year);
  const month = Number(raw.month);

  return {
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  const [monthly, yearly] = await Promise.all([
    reportService.getMonthlySummary(user.id, year, month),
    reportService.getYearlySummary(user.id, year),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Laporan</h1>
          <p className="text-xs text-gray-400">Pratinjau dan unduh rekap PDF</p>
        </div>
        <PeriodSwitcher year={year} month={month} basePath="/reports" />
      </div>

      <Card>
        <SectionTitle title="Pratinjau & Unduh Laporan" />
        <ReportPanel year={year} month={month} />
      </Card>

      <Card>
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
            <dd className="font-semibold text-gray-700">
              {monthly.transactionCount}
            </dd>
          </div>
        </dl>
      </Card>

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
              {yearly.months.map((point) => (
                <tr key={point.month}>
                  <td className="py-2 text-xs font-semibold text-gray-600">
                    {MONTH_NAMES_ID[point.month - 1]}
                  </td>
                  <td className="py-2 text-right text-xs">
                    <Money value={point.income} tone="income" />
                  </td>
                  <td className="py-2 text-right text-xs">
                    <Money value={point.expense} tone="expense" />
                  </td>
                  <td className="py-2 text-right text-xs font-semibold">
                    <Money value={point.net} tone="auto" />
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
