"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import { Sheet } from "@/src/core/components/ui/sheet";
import { useApiMutation } from "@/src/core/hooks/use-api-mutation";
import { accountApi } from "@/src/core/accounts/account.api";
import type { AccountUsageDTO } from "@/src/core/accounts/services/account.service";
import type { AccountInput } from "@/src/core/accounts/validators/account.validator";

type AccountType = "CASH" | "BANK";

type AccountForm = {
  name: string;
  type: AccountType;
  color: string;
  bankName: string;
  accountNumber: string;
  openingBalance: string;
};

const COLORS = [
  "#7BC67B",
  "#8FD3C1",
  "#A3C7E8",
  "#9AD0EC",
  "#C9B6E4",
  "#FFBE91",
  "#FFD59E",
  "#F5A9A9",
  "#E3B46D",
  "#D0D0D0",
];

const BLANK: AccountForm = {
  name: "",
  type: "CASH",
  color: COLORS[0],
  bankName: "",
  accountNumber: "",
  openingBalance: "0",
};

const TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Cash",
  BANK: "Bank",
};

const TYPE_ICON: Record<AccountType, string> = {
  CASH: "ph:wallet",
  BANK: "ph:bank",
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Rp0";
  }

  return currencyFormatter.format(amount);
}

function AccountRow({
  account,
  onEdit,
  onDeleted,
}: {
  account: AccountUsageDTO;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { run, pending } = useApiMutation(accountApi.remove);

  async function handleDelete() {
    const warning = account.transactionCount
      ? `Nonaktifkan akun "${account.name}"? ${account.transactionCount} transaksi yang sudah menggunakan akun ini tetap tersimpan.`
      : `Nonaktifkan akun "${account.name}"?`;

    if (!confirm(warning)) return;

    if (await run(account.uuid)) {
      onDeleted();
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 transition-colors hover:bg-gray-50">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700"
        style={{
          backgroundColor: account.color ?? "#F1F1F1",
        }}
      >
        <DynamicIcon icon={TYPE_ICON[account.type]} fontSize="18px" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-800">
            {account.name}
          </p>

          {!account.isActive && (
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
              Nonaktif
            </span>
          )}
        </div>

        <p className="truncate text-[11px] text-gray-400">
          {account.type === "BANK"
            ? [account.bankName, account.accountNumber]
                .filter(Boolean)
                .join(" • ") || "Rekening bank"
            : "Cash"}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-bold text-gray-800">
          {formatCurrency(account.balance)}
        </p>
        <p className="text-[10px] text-gray-400">
          {account.transactionCount} transaksi
        </p>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah akun ${account.name}`}
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
      </button>

      {account.isActive && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`Nonaktifkan akun ${account.name}`}
          className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          <DynamicIcon icon="ph:trash" fontSize="16px" />
        </button>
      )}
    </li>
  );
}

export default function AccountSettings({
  accounts,
}: {
  accounts: AccountUsageDTO[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(BLANK);

  const save = useCallback(
    (uuid: string | null, input: AccountInput) =>
      uuid ? accountApi.update(uuid, input) : accountApi.create(input),
    [],
  );

  const { run, pending, error, fieldErrors, reset } = useApiMutation(save);

  function openCreate(type: AccountType) {
    setEditingUuid(null);
    setForm({
      ...BLANK,
      type,
    });
    reset();
    setOpen(true);
  }

  function openEdit(account: AccountUsageDTO) {
    setEditingUuid(account.uuid);
    setForm({
      name: account.name,
      type: account.type,
      color: account.color ?? COLORS[0],
      bankName: account.bankName ?? "",
      accountNumber: account.accountNumber ?? "",
      openingBalance: account.openingBalance,
    });
    reset();
    setOpen(true);
  }

  function changeType(type: AccountType) {
    setForm((prev) => ({
      ...prev,
      type,
      ...(type === "CASH"
        ? {
            bankName: "",
            accountNumber: "",
          }
        : {}),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const input: AccountInput = {
      name: form.name,
      type: form.type,
      color: form.color,
      bankName: form.type === "BANK" ? form.bankName : null,
      accountNumber: form.type === "BANK" ? form.accountNumber : null,
      openingBalance: form.openingBalance,
    };

    const saved = await run(editingUuid, input);

    if (!saved) return;

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {(["CASH", "BANK"] as const).map((type) => {
        const items = accounts.filter(
          (account) => account.type === type && account.isActive,
        );

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
                icon={TYPE_ICON[type]}
                title={`Belum ada akun ${TYPE_LABEL[type].toLowerCase()}`}
                description={
                  type === "CASH"
                    ? "Tambahkan akun untuk mencatat uang tunai yang kamu miliki."
                    : "Tambahkan rekening bank yang kamu gunakan."
                }
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((account) => (
                  <AccountRow
                    key={account.uuid}
                    account={account}
                    onEdit={() => openEdit(account)}
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
        title={editingUuid ? "Ubah Akun" : "Tambah Akun"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["CASH", "BANK"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeType(option)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-colors ${
                  form.type === option
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <DynamicIcon icon={TYPE_ICON[option]} fontSize="16px" />
                {TYPE_LABEL[option]}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label="Nama Akun"
            required
            maxLength={100}
            placeholder={
              form.type === "CASH"
                ? "Misalnya: Dompet"
                : "Misalnya: Rekening Utama"
            }
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            errors={fieldErrors.name}
          />

          {form.type === "BANK" && (
            <>
              <Input
                label="Nama Bank"
                required
                maxLength={100}
                placeholder="Misalnya: BCA"
                value={form.bankName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bankName: event.target.value,
                  }))
                }
                errors={fieldErrors.bankName}
              />

              <Input
                label="Nomor Rekening"
                maxLength={100}
                placeholder="Misalnya: 1234567890"
                value={form.accountNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    accountNumber: event.target.value,
                  }))
                }
                errors={fieldErrors.accountNumber}
              />
            </>
          )}

          <Input
            label="Saldo Awal"
            required
            inputMode="decimal"
            placeholder="0"
            value={form.openingBalance}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                openingBalance: event.target.value,
              }))
            }
            errors={fieldErrors.openingBalance}
          />

          {editingUuid && (
            <p className="-mt-2 text-xs leading-relaxed text-gray-400">
              Perubahan saldo awal akan menyesuaikan saldo akun berdasarkan
              selisih dari saldo awal sebelumnya.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Warna
            </label>

            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      color,
                    }))
                  }
                  aria-label={`Warna ${color}`}
                  aria-pressed={form.color === color}
                  style={{
                    backgroundColor: color,
                  }}
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