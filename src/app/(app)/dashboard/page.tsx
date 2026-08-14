import Link from "next/link";
import { requireAuthUser } from "@/src/core/auth/dal";
import { reportService } from "@/src/core/reports/services/report.service";
import { currentPeriod, formatDateID, monthLabel } from "@/src/core/lib/date";
import { Card, SectionTitle } from "@/src/core/components/ui/card";
import { Money } from "@/src/core/components/ui/money";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import PeriodSwitcher from "./period-switcher";
import YearChart from "./year-chart";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthUser();
  const { year, month } = resolvePeriod(await searchParams);

  const [summary, yearly, debts, recent] = await Promise.all([
    reportService.getMonthlySummary(user.id, year, month),
    reportService.getYearlySummary(user.id, year),
    reportService.getDebtSummary(user.id),
    reportService.getRecentTransactions(user.id, 5),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ringkasan</h1>
          <p className="text-xs text-gray-400">{monthLabel(year, month)}</p>
        </div>
        <PeriodSwitcher year={year} month={month} basePath="/dashboard" />
      </div>

      <Card className="bg-theme-light border-theme-light-border">
        <p className="text-xs font-semibold text-gray-500">Selisih bulan ini</p>
        <p className="mt-1 text-3xl font-bold">
          <Money value={summary.net} tone="auto" />
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          dari {summary.transactionCount} transaksi
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <DynamicIcon icon="ph:arrow-down-left" fontSize="14px" />
            <p className="text-xs font-semibold">Pemasukan</p>
          </div>
          <p className="mt-1.5 text-base font-bold">
            <Money value={summary.income} tone="income" />
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-red-500">
            <DynamicIcon icon="ph:arrow-up-right" fontSize="14px" />
            <p className="text-xs font-semibold">Pengeluaran</p>
          </div>
          <p className="mt-1.5 text-base font-bold">
            <Money value={summary.expense} tone="expense" />
          </p>
        </Card>
      </div>

      <Card>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold text-emerald-700">
              Piutang ({debts.receivableCount})
            </p>
            <p className="mt-1 text-sm font-bold">
              <Money value={debts.receivableOutstanding} tone="income" />
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-[11px] font-semibold text-red-600">
              Hutang ({debts.payableCount})
            </p>
            <p className="mt-1 text-sm font-bold">
              <Money value={debts.payableOutstanding} tone="expense" />
            </p>
          </div>
        </div>
      </Card>

      {summary.expenseByCategory.length > 0 && (
        <Card>
          <SectionTitle title="Pengeluaran per Kategori" />
          <ul className="flex flex-col gap-3">
            {summary.expenseByCategory.slice(0, 5).map((item) => (
              <li key={item.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">{item.name}</span>
                  <span className="text-gray-500">
                    <Money value={item.total} />
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(item.share * 100, 2)}%`,
                      backgroundColor: item.color ?? "#FFBE91",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <SectionTitle
          title="Transaksi Terakhir"
          action={
            <Link
              href="/transactions"
              className="text-xs font-semibold text-gray-500 hover:underline"
            >
              Lihat semua
            </Link>
          }
        />

        {recent.length === 0 ? (
          <EmptyState
            icon="ph:receipt"
            title="Belum ada transaksi"
            description="Tambahkan pemasukan atau pengeluaran pertama Anda dari menu Transaksi."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-gray-50">
            {recent.map((transaction) => (
              <li key={transaction.uuid} className="flex items-center gap-3 py-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700"
                  style={{ backgroundColor: transaction.category?.color ?? "#F1F1F1" }}
                >
                  <DynamicIcon
                    icon={transaction.category?.icon ?? "ph:circle-dashed"}
                    fontSize="16px"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {transaction.category?.name ?? "Tanpa Kategori"}
                  </p>
                  <p className="truncate text-[11px] text-gray-400">
                    {formatDateID(transaction.occurredAt)}
                    {transaction.note ? ` · ${transaction.note}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold">
                  <Money
                    value={transaction.amount}
                    tone={transaction.type === "INCOME" ? "income" : "expense"}
                  />
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
