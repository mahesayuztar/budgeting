"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import { Sheet } from "@/src/core/components/ui/sheet";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { categoryApi } from "@/src/core/categories/category.api";
import type { CategoryUsageDTO } from "@/src/core/categories/services/category.service";
import type { CategoryInput } from "@/src/core/categories/validators/category.validator";

type TransactionType = "INCOME" | "EXPENSE";

const ICONS = [
  "ph:wallet", "ph:gift", "ph:plus-circle", "ph:fork-knife",
  "ph:bus", "ph:shopping-bag", "ph:receipt", "ph:game-controller",
  "ph:house", "ph:heartbeat", "ph:graduation-cap", "ph:airplane-tilt",
  "ph:coffee", "ph:gas-pump", "ph:t-shirt", "ph:piggy-bank",
  "ph:cell-phone", "ph:paw-print", "ph:baby", "ph:dots-three-circle",
];

const COLORS = [
  "#7BC67B", "#8FD3C1", "#A3C7E8", "#9AD0EC", "#C9B6E4",
  "#FFBE91", "#FFD59E", "#F5A9A9", "#E3B46D", "#D0D0D0",
];

const BLANK = {
  name: "",
  type: "EXPENSE" as TransactionType,
  icon: ICONS[0],
  color: COLORS[0],
};

const TYPE_LABEL: Record<TransactionType, string> = {
  EXPENSE: "Pengeluaran",
  INCOME: "Pemasukan",
};

function CategoryRow({
  category,
  onEdit,
  onDeleted,
}: {
  category: CategoryUsageDTO;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { run, pending } = useApiAction(categoryApi.remove);

  async function handleDelete() {
    const warning = category.transactionCount
      ? `Hapus kategori "${category.name}"? ${category.transactionCount} transaksi akan menjadi tanpa kategori.`
      : `Hapus kategori "${category.name}"?`;

    if (!confirm(warning)) return;
    if (await run(category.uuid)) onDeleted();
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700"
        style={{ backgroundColor: category.color ?? "#F1F1F1" }}
      >
        <DynamicIcon icon={category.icon ?? "ph:circle-dashed"} fontSize="16px" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          {category.name}
        </p>
        <p className="text-[11px] text-gray-400">
          {category.transactionCount} transaksi
        </p>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah kategori ${category.name}`}
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label={`Hapus kategori ${category.name}`}
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <DynamicIcon icon="ph:trash" fontSize="16px" />
      </button>
    </li>
  );
}

export default function CategorySettings({
  categories,
}: {
  categories: CategoryUsageDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  // Satu aksi untuk dua mode supaya pesan error dan state pending-nya tunggal.
  const save = useCallback(
    (uuid: string | null, input: CategoryInput) =>
      uuid ? categoryApi.update(uuid, input) : categoryApi.create(input),
    [],
  );

  const { run, pending, error, fieldErrors, reset } = useApiAction(save);

  function openCreate(type: TransactionType) {
    setEditingUuid(null);
    setForm({ ...BLANK, type });
    reset();
    setOpen(true);
  }

  function openEdit(category: CategoryUsageDTO) {
    setEditingUuid(category.uuid);
    setForm({
      name: category.name,
      type: category.type,
      icon: category.icon ?? ICONS[0],
      color: category.color ?? COLORS[0],
    });
    reset();
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const saved = await run(editingUuid, form);
    if (!saved) return;

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {(["EXPENSE", "INCOME"] as const).map((type) => {
        const items = categories.filter((category) => category.type === type);

        return (
          <div key={type} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {TYPE_LABEL[type]}
              </h3>
              <button
                type="button"
                onClick={() => openCreate(type)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-theme-accent hover:text-gray-900"
              >
                <DynamicIcon icon="ph:plus" fontSize="14px" />
                Tambah
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon="ph:tag"
                title={`Belum ada kategori ${TYPE_LABEL[type].toLowerCase()}`}
                description="Tambahkan kategori agar transaksi lebih mudah dikelompokkan."
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((category) => (
                  <CategoryRow
                    key={category.uuid}
                    category={category}
                    onEdit={() => openEdit(category)}
                    onDeleted={() => router.refresh()}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <Sheet
        open={open}
        title={editingUuid ? "Ubah Kategori" : "Tambah Kategori"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["EXPENSE", "INCOME"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: option }))}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                  form.type === option
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {TYPE_LABEL[option]}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label="Nama Kategori"
            required
            maxLength={50}
            placeholder="Misalnya: Belanja Bulanan"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            errors={fieldErrors.name}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Ikon</label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, icon }))}
                  aria-label={icon}
                  aria-pressed={form.icon === icon}
                  className={`flex h-10 items-center justify-center rounded-xl border transition-colors ${
                    form.icon === icon
                      ? "border-theme-light-border bg-theme-light text-gray-800"
                      : "border-gray-200 text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <DynamicIcon icon={icon} fontSize="18px" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Warna</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  aria-label={`Warna ${color}`}
                  aria-pressed={form.color === color}
                  style={{ backgroundColor: color }}
                  className={`h-9 w-9 rounded-full transition-transform ${
                    form.color === color
                      ? "ring-2 ring-gray-800 ring-offset-2"
                      : "hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
