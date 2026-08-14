"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Button } from "@/src/core/components/ui/button";
import { Card } from "@/src/core/components/ui/card";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { Sheet } from "@/src/core/components/ui/sheet";
import { Money } from "@/src/core/components/ui/money";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { debtApi } from "@/src/core/debts/debt.api";
import { formatDateID, toDateInputValue } from "@/src/core/lib/date";
import type { DebtDTO } from "@/src/core/debts/services/debt.service";

export default function DebtCard({ debt }: { debt: DebtDTO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => toDateInputValue(new Date()));
  const [note, setNote] = useState("");

  const payment = useApiAction(
    (input: Parameters<typeof debtApi.addPayment>[1]) =>
      debtApi.addPayment(debt.uuid, input),
  );
  const removal = useApiAction(debtApi.remove);

  const isReceivable = debt.type === "RECEIVABLE";
  const progress = debt.amount > 0 ? Math.min(debt.paidAmount / debt.amount, 1) : 0;
  const isPaid = debt.status === "PAID";

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
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Hapus catatan ${isReceivable ? "piutang" : "hutang"} ${debt.party}?`)) {
      return;
    }

    const result = await removal.run(debt.uuid);
    if (result) router.refresh();
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isReceivable ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}
        >
          <DynamicIcon
            icon={isReceivable ? "ph:hand-coins" : "ph:hand-withdraw"}
            fontSize="18px"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-800">{debt.party}</p>
              <p className="text-[11px] text-gray-400">
                {isReceivable ? "Piutang" : "Hutang"}
                {debt.dueDate ? ` · Jatuh tempo ${formatDateID(debt.dueDate)}` : ""}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isPaid ? "Lunas" : "Berjalan"}
            </span>
          </div>

          {debt.note && (
            <p className="mt-1 truncate text-[11px] text-gray-400">{debt.note}</p>
          )}

          <div className="mt-2.5 flex items-end justify-between text-xs">
            <span className="text-gray-500">
              Terbayar <Money value={debt.paidAmount} />
            </span>
            <span className="font-bold">
              <Money value={debt.amount} />
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                isReceivable ? "bg-emerald-400" : "bg-red-400"
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {!isPaid && (
            <p className="mt-1.5 text-[11px] font-semibold text-gray-500">
              Sisa{" "}
              <Money
                value={debt.remaining}
                tone={isReceivable ? "income" : "expense"}
              />
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {!isPaid && (
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-2 text-xs"
                onClick={() => setOpen(true)}
              >
                Catat pembayaran
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs"
              disabled={removal.pending}
              onClick={handleDelete}
            >
              Hapus
            </Button>
          </div>

          <ErrorAlert message={removal.error} />
        </div>
      </div>

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
    </Card>
  );
}
