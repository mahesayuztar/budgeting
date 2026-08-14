"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Money } from "@/src/core/components/ui/money";
import {
  DataTable,
  type AppColumnDef,
} from "@/src/core/components/ui/data-table";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { Sheet } from "@/src/core/components/ui/sheet";
import { useApiMutation } from "@/src/core/hooks/use-api-mutation";
import { debtApi } from "@/src/core/debts/debt.api";
import type { DebtDTO } from "@/src/core/debts/services/debt.service";
import type { DebtType } from "@prisma/client";
import type { Page } from "@/src/core/lib/pagination";
import { formatDateID, toDateInputValue } from "@/src/core/lib/date";

function RowActions({ debt, onDone }: { debt: DebtDTO; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => toDateInputValue(new Date()));
  const [note, setNote] = useState("");

  const payment = useApiMutation(
    (input: Parameters<typeof debtApi.addPayment>[1]) =>
      debtApi.addPayment(debt.uuid, input),
    { invalidateKeys: [["debts"]] },
  );
  const removal = useApiMutation(debtApi.remove, {
    invalidateKeys: [["debts"]],
  });

  function close() {
    setOpen(false);
    payment.reset();
  }

  async function handlePay(event: React.FormEvent) {
    event.preventDefault();

    const updated = await payment.run({
      amount: Number(amount),
      paidAt,
      note: note || null,
    });
    if (!updated) return;

    setAmount("");
    setNote("");
    close();
    onDone();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {debt.status === "OPEN" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Catat pembayaran untuk ${debt.party}`}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
        >
          <DynamicIcon icon="ph:cash-register" fontSize="16px" />
        </button>
      )}

      <button
        type="button"
        disabled={removal.pending}
        aria-label={`Hapus catatan ${debt.party}`}
        onClick={async () => {
          if (!confirm(`Hapus catatan ${debt.party}?`)) return;
          if (await removal.run(debt.uuid)) onDone();
        }}
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <DynamicIcon icon="ph:trash" fontSize="16px" />
      </button>

      <Sheet open={open} title={`Pembayaran - ${debt.party}`} onClose={close}>
        <form onSubmit={handlePay} className="flex flex-col gap-4">
          <p className="rounded-xl bg-theme-light px-4 py-3 text-xs font-semibold text-gray-600">
            Sisa tagihan <Money value={debt.remaining} />
          </p>

          <ErrorAlert message={payment.error} />

          <Input
            label="Jumlah Bayar"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            errors={payment.fieldErrors.amount}
          />
          <Input
            label="Tanggal Bayar"
            type="date"
            required
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            errors={payment.fieldErrors.paidAt}
          />
          <Input
            label="Catatan"
            placeholder="Opsional"
            maxLength={255}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            errors={payment.fieldErrors.note}
          />

          <Button type="submit" fullWidth disabled={payment.pending}>
            {payment.pending ? "Menyimpan..." : "Simpan Pembayaran"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

export default function DebtsTable({
  type,
  initialPage,
}: {
  type: DebtType;
  initialPage: Page<DebtDTO>;
}) {
  const router = useRouter();

  const columns = useMemo<AppColumnDef<DebtDTO>[]>(() => {
    // Invalidate ["debts"] sudah otomatis lewat useApiMutation di
    // RowActions; di sini cukup refresh kartu ringkasan yang di-render
    // server (di luar cache React Query).
    const refresh = () => router.refresh();

    return [
      {
        id: "party",
        header: "Pihak",
        // Lihat catatan yang sama di transactions-table.
        meta: { className: "w-full max-w-0" },
        cell: ({ row }) => {
          const debt = row.original;
          const isReceivable = debt.type === "RECEIVABLE";
          const progress =
            debt.amount > 0 ? Math.min(debt.paidAmount / debt.amount, 1) : 0;

          return (
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isReceivable
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                <DynamicIcon
                  icon={isReceivable ? "ph:hand-coins" : "ph:hand-withdraw"}
                  fontSize="16px"
                />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-800">
                  {debt.party}
                </p>
                {debt.note && (
                  <p className="truncate text-[11px] text-gray-400">{debt.note}</p>
                )}
                {/* Bilah kemajuan hanya di ponsel; layar lebar punya kolomnya. */}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 md:hidden">
                  <div
                    className={`h-full rounded-full ${
                      isReceivable ? "bg-emerald-400" : "bg-red-400"
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "dueDate",
        header: "Jatuh Tempo",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-gray-500">
            {row.original.dueDate ? formatDateID(row.original.dueDate) : "-"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell", headerClassName: "hidden lg:table-cell" },
      },
      {
        id: "progress",
        header: "Terbayar",
        cell: ({ row }) => {
          const debt = row.original;
          const progress =
            debt.amount > 0 ? Math.min(debt.paidAmount / debt.amount, 1) : 0;

          return (
            <div className="w-32">
              <p className="text-xs text-gray-500">
                <Money value={debt.paidAmount} /> / <Money value={debt.amount} />
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    debt.type === "RECEIVABLE" ? "bg-emerald-400" : "bg-red-400"
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          );
        },
        meta: { className: "hidden md:table-cell", headerClassName: "hidden md:table-cell" },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
              row.original.status === "PAID"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {row.original.status === "PAID" ? "Lunas" : "Berjalan"}
          </span>
        ),
        meta: { className: "hidden sm:table-cell", headerClassName: "hidden sm:table-cell" },
      },
      {
        id: "remaining",
        header: "Sisa",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-bold">
            <Money
              value={row.original.remaining}
              tone={row.original.type === "RECEIVABLE" ? "income" : "expense"}
            />
          </span>
        ),
        meta: { className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <RowActions debt={row.original} onDone={refresh} />,
        meta: { className: "w-20 text-right", headerClassName: "w-20" },
      },
    ];
  }, [router]);

  return (
    <DataTable
      queryKey={["debts", type]}
      initialPage={initialPage}
      fetchPage={({ cursor, q }) => debtApi.list({ type, cursor, q })}
      columns={columns}
      getRowId={(row) => row.uuid}
      searchPlaceholder="Cari nama pihak atau catatan..."
      emptyIcon="ph:handshake"
      emptyTitle="Belum ada catatan"
      emptyDescription="Gunakan tombol Tambah Hutang / Piutang untuk mencatat yang baru."
    />
  );
}
