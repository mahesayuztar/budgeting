"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Money } from "@/src/core/components/ui/money";
import {
  DataTable,
  type AppColumnDef,
} from "@/src/core/components/ui/data-table";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { transactionApi } from "@/src/core/transactions/transaction.api";
import type { TransactionDTO } from "@/src/core/transactions/services/transaction.service";
import type { Page } from "@/src/core/lib/pagination";
import { formatDateID, formatDateShort } from "@/src/core/lib/date";

function DeleteButton({ uuid, onDone }: { uuid: string; onDone: () => void }) {
  const { run, pending } = useApiAction(transactionApi.remove);

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Hapus transaksi"
      onClick={async () => {
        if (!confirm("Hapus transaksi ini?")) return;
        if (await run(uuid)) onDone();
      }}
      className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
    >
      <DynamicIcon icon="ph:trash" fontSize="16px" />
    </button>
  );
}

export default function TransactionsTable({
  year,
  month,
  initialPage,
}: {
  year: number;
  month: number;
  initialPage: Page<TransactionDTO>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const columns = useMemo<AppColumnDef<TransactionDTO>[]>(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      router.refresh();
    };

    return [
      {
        id: "category",
        header: "Kategori",
        meta: { className: "w-[30vw] max-w-0" },
        cell: ({ row }) => {
          const item = row.original;

          return (
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700"
                style={{ backgroundColor: item.category?.color ?? "#F1F1F1" }}
              >
                <DynamicIcon
                  icon={item.category?.icon ?? "ph:circle-dashed"}
                  fontSize="16px"
                />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800">
                  {item.category?.name ?? "Tanpa Kategori"}
                </p>
                {/* Tanggal & catatan punya kolom sendiri di layar lebar;
                    di ponsel ikut menumpang di sel ini. */}
                <p className="truncate text-[11px] text-gray-400 md:hidden">
                  {formatDateShort(item.occurredAt)}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "occurredAt",
        header: "Tanggal",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-gray-500">
            {formatDateID(row.original.occurredAt)}
          </span>
        ),
        meta: {
          className: "hidden md:table-cell",
          headerClassName: "hidden md:table-cell",
        },
      },
      {
        id: "note",
        header: "Catatan",
        cell: ({ row }) => (
          <span className="text-xs text-gray-500">
            {row.original.note || "-"}
          </span>
        ),
        meta: {
          className: "hidden lg:table-cell",
          headerClassName: "hidden lg:table-cell",
        },
      },
      {
        id: "type",
        header: "Tipe",
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              row.original.type === "INCOME"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {row.original.type === "INCOME" ? "Masuk" : "Keluar"}
          </span>
        ),
        meta: {
          className: "hidden md:table-cell",
          headerClassName: "hidden md:table-cell",
        },
      },
      {
        id: "amount",
        header: "Jumlah",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-bold">
            <Money
              value={row.original.amount}
              tone={row.original.type === "INCOME" ? "income" : "expense"}
            />
          </span>
        ),
        meta: { className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DeleteButton uuid={row.original.uuid} onDone={refresh} />
        ),
        meta: { className: "w-10 text-right", headerClassName: "w-10" },
      },
    ];
  }, [queryClient, router]);

  return (
    <DataTable
      queryKey={["transactions", year, month]}
      initialPage={initialPage}
      fetchPage={({ cursor, q }) =>
        transactionApi.list({ year, month, cursor, q })
      }
      columns={columns}
      getRowId={(row) => row.uuid}
      searchPlaceholder="Cari catatan atau kategori..."
      emptyIcon="ph:receipt"
      emptyTitle="Belum ada transaksi"
      emptyDescription="Gunakan tombol Tambah Transaksi untuk mengisi."
    />
  );
}
