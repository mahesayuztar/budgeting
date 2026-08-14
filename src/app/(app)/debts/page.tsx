import Link from "next/link";
import { requireAuthUser } from "@/src/core/auth/dal";
import { debtService } from "@/src/core/debts/services/debt.service";
import { reportService } from "@/src/core/reports/services/report.service";
import { Card } from "@/src/core/components/ui/card";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import { Money } from "@/src/core/components/ui/money";
import DebtCard from "./debt-card";
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

  const [debts, summary] = await Promise.all([
    debtService.list(user.id, { type: active }),
    reportService.getDebtSummary(user.id),
  ]);

  const outstanding =
    active === "RECEIVABLE"
      ? summary.receivableOutstanding
      : summary.payableOutstanding;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Hutang &amp; Piutang</h1>
        <p className="text-xs text-gray-400">Catat pinjaman masuk dan keluar</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/debts?type=${tab.value}`}
            className={`rounded-lg py-2 text-center text-sm font-bold transition-colors ${
              active === tab.value ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card className="border-theme-light-border bg-theme-light">
        <p className="text-xs font-semibold text-gray-500">
          Total {active === "RECEIVABLE" ? "piutang" : "hutang"} belum lunas
        </p>
        <p className="mt-1 text-2xl font-bold">
          <Money
            value={outstanding}
            tone={active === "RECEIVABLE" ? "income" : "expense"}
          />
        </p>
      </Card>

      {debts.length === 0 ? (
        <Card>
          <EmptyState
            icon="ph:handshake"
            title="Belum ada catatan"
            description="Tekan tombol + untuk mencatat hutang atau piutang baru."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {debts.map((debt) => (
            <DebtCard key={debt.uuid} debt={debt} />
          ))}
        </div>
      )}

      <DebtForm />
    </div>
  );
}
