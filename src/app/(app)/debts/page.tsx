import Link from "next/link";
import { requireAuthUser } from "@/src/core/auth/dal";
import { debtService } from "@/src/core/debts/services/debt.service";
import { reportService } from "@/src/core/reports/services/report.service";
import { Card } from "@/src/core/components/ui/card";
import { PageHeader } from "@/src/core/components/ui/page-header";
import { Money } from "@/src/core/components/ui/money";
import DebtsTable from "./debts-table";
import DebtForm from "./debt-form";

type SearchParams = Promise<{ type?: string }>;

const TABS = [
  { value: "PAYABLE", label: "Hutang Saya" },
  { value: "RECEIVABLE", label: "Piutang Saya" },
] as const;

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthUser();
  const { type: rawType } = await searchParams;

  const active = rawType === "RECEIVABLE" ? "RECEIVABLE" : "PAYABLE";

  const [initialPage, summary] = await Promise.all([
    debtService.list(user.id, { type: active }),
    reportService.getDebtSummary(user.id),
  ]);

  const outstanding =
    active === "RECEIVABLE"
      ? summary.receivableOutstanding
      : summary.payableOutstanding;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Hutang & Piutang"
        subtitle="Catat pinjaman masuk dan keluar"
      >
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/debts?type=${tab.value}`}
              className={`rounded-lg px-4 py-2 text-center text-sm font-bold transition-colors ${
                active === tab.value
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <DebtForm />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 border-theme-light-border bg-theme-light sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500">
            {active === "RECEIVABLE" ? "Piutang" : "Hutang"} belum lunas
          </p>
          <p className="mt-1 text-xl font-bold sm:text-lg lg:text-xl">
            <Money
              value={outstanding}
              tone={active === "RECEIVABLE" ? "income" : "expense"}
            />
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500">
            Total Piutang ({summary.receivableCount})
          </p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.receivableOutstanding} tone="income" />
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500">
            Total Hutang ({summary.payableCount})
          </p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            <Money value={summary.payableOutstanding} tone="expense" />
          </p>
        </Card>
      </div>

      <Card>
        <DebtsTable type={active} initialPage={initialPage} />
      </Card>
    </div>
  );
}
