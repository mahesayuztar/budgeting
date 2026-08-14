"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/core/components/ui/button";
import { Input, Select } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { Sheet } from "@/src/core/components/ui/sheet";
import { AddButton } from "@/src/core/components/ui/add-button";
import { useApiMutation } from "@/src/core/hooks/use-api-mutation";
import { transactionApi } from "@/src/core/transactions/transaction.api";
import type { CategoryDTO } from "@/src/core/categories/services/category.service";
import { toDateInputValue } from "@/src/core/lib/date";
import { AccountDTO } from "@/src/core/accounts/services/account.service";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export default function TransactionForm({
  categories,
  accounts,
}: {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryUuid, setCategoryUuid] = useState("");
  const [accountUuid, setAccountUuid] = useState(accounts?.[0]?.uuid ?? "");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDateInputValue(new Date()));

  const { run, pending, error, fieldErrors, reset } = useApiMutation(
    transactionApi.create,
    { invalidateKeys: [["transactions"]] },
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
      <AddButton label="Tambah Transaksi" onClick={() => setOpen(true)} />

      <Sheet open={open} title="Tambah Transaksi" onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((option) => (
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
                {option === "EXPENSE" ? "Pengeluaran" : option === "INCOME" ? "Pemasukan" : "Transfer"}
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

          <Select
            label="Akun Rekening"
            value={accountUuid}
            onChange={(event) => setAccountUuid(event.target.value)}
            errors={fieldErrors.accountUuid}
          >
            <option value="">Tanpa akun</option>
            {accounts.map((account) => (
              <option key={account.uuid} value={account.uuid}>
                {account.name}
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
