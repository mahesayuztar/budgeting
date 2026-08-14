"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/core/components/ui/button";
import { Input, Select } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { Sheet } from "@/src/core/components/ui/sheet";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { transactionApi } from "@/src/core/transactions/transaction.api";
import type { CategoryDTO } from "@/src/core/categories/services/category.service";
import { toDateInputValue } from "@/src/core/lib/date";

type TransactionType = "INCOME" | "EXPENSE";

export default function TransactionForm({
  categories,
}: {
  categories: CategoryDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryUuid, setCategoryUuid] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDateInputValue(new Date()));

  const { run, pending, error, fieldErrors, reset } = useApiAction(
    transactionApi.create,
  );

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  function close() {
    setOpen(false);
    reset();
  }

  function switchType(next: TransactionType) {
    setType(next);
    setCategoryUuid("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const created = await run({
      type,
      amount: Number(amount),
      categoryUuid: categoryUuid || null,
      note: note || null,
      occurredAt,
    });

    if (!created) return;

    setAmount("");
    setNote("");
    setCategoryUuid("");
    close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-theme-accent text-gray-800 shadow-lg shadow-theme-accent/40 transition-transform active:scale-95 md:bottom-8 md:right-8"
        aria-label="Tambah transaksi"
      >
        <DynamicIcon icon="ph:plus" fontSize="24px" />
      </button>

      <Sheet open={open} title="Tambah Transaksi" onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["EXPENSE", "INCOME"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchType(option)}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                  type === option
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {option === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

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

          <Select
            label="Kategori"
            value={categoryUuid}
            onChange={(event) => setCategoryUuid(event.target.value)}
            errors={fieldErrors.categoryUuid}
          >
            <option value="">Tanpa kategori</option>
            {visibleCategories.map((category) => (
              <option key={category.uuid} value={category.uuid}>
                {category.name}
              </option>
            ))}
          </Select>

          <Input
            label="Tanggal"
            type="date"
            required
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            errors={fieldErrors.occurredAt}
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
