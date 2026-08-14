"use client";

import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Money } from "@/src/core/components/ui/money";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { transactionApi } from "@/src/core/transactions/transaction.api";
import type { TransactionDTO } from "@/src/core/transactions/services/transaction.service";

export default function TransactionItem({
  transaction,
}: {
  transaction: TransactionDTO;
}) {
  const router = useRouter();
  const { run, pending } = useApiAction(transactionApi.remove);

  async function handleDelete() {
    if (!confirm("Hapus transaksi ini?")) return;

    const result = await run(transaction.uuid);
    if (result) router.refresh();
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
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
        {transaction.note && (
          <p className="truncate text-[11px] text-gray-400">{transaction.note}</p>
        )}
      </div>

      <p className="shrink-0 text-sm font-bold">
        <Money
          value={transaction.amount}
          tone={transaction.type === "INCOME" ? "income" : "expense"}
        />
      </p>

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Hapus transaksi"
        className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <DynamicIcon icon="ph:trash" fontSize="16px" />
      </button>
    </li>
  );
}
