"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { Sheet } from "@/src/core/components/ui/sheet";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { debtApi } from "@/src/core/debts/debt.api";

type DebtType = "RECEIVABLE" | "PAYABLE";

export default function DebtForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DebtType>("PAYABLE");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const { run, pending, error, fieldErrors, reset } = useApiAction(debtApi.create);

  function close() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const created = await run({
      type,
      party,
      amount: Number(amount),
      dueDate: dueDate || null,
      note: note || null,
    });

    if (!created) return;

    setParty("");
    setAmount("");
    setDueDate("");
    setNote("");
    close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-theme-accent text-gray-800 shadow-lg shadow-theme-accent/40 transition-transform active:scale-95 md:bottom-8 md:right-8"
        aria-label="Tambah hutang atau piutang"
      >
        <DynamicIcon icon="ph:plus" fontSize="24px" />
      </button>

      <Sheet open={open} title="Tambah Hutang / Piutang" onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["PAYABLE", "RECEIVABLE"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                  type === option ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                }`}
              >
                {option === "PAYABLE" ? "Saya Berhutang" : "Saya Piutang"}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label={type === "PAYABLE" ? "Berhutang kepada" : "Dipinjam oleh"}
            required
            maxLength={80}
            placeholder="Nama orang / pihak"
            value={party}
            onChange={(event) => setParty(event.target.value)}
            errors={fieldErrors.party}
          />

          <Input
            label="Jumlah"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            errors={fieldErrors.amount}
          />

          <Input
            label="Jatuh Tempo"
            type="date"
            hint="Opsional"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            errors={fieldErrors.dueDate}
          />

          <Input
            label="Catatan"
            placeholder="Opsional"
            maxLength={255}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            errors={fieldErrors.note}
          />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
