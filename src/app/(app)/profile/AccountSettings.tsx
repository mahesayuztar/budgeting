'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Sheet } from '@/src/components/ui/Sheet';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { formatIDR } from '@/src/helpers/MoneyHelper';
import { accountApi } from '@/src/lib/accounts/AccountApi';
import { ENTITY_COLORS } from '@/src/lib/ThemeConstants';
import type { AccountUsageDTO } from '@/src/lib/accounts/AccountService';
import type { AccountInput } from '@/src/lib/accounts/AccountValidator';

type AccountType = 'CASH' | 'BANK';

type AccountForm = {
  name: string;
  type: AccountType;
  color: string;
  bankName: string;
  accountNumber: string;
  openingBalance: string;
};

const EMPTY_ACCOUNT_FORM: AccountForm = {
  name: '',
  type: 'CASH',
  color: ENTITY_COLORS[0],
  bankName: '',
  accountNumber: '',
  openingBalance: '0',
};

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: 'Cash',
  BANK: 'Bank',
};

const ACCOUNT_TYPE_ICON: Record<AccountType, string> = {
  CASH: 'ph:wallet',
  BANK: 'ph:bank',
};

const ACCOUNT_TYPES: ReadonlyArray<AccountType> = ['CASH', 'BANK'];

type AccountRowOwnProps = {
  account: AccountUsageDTO;
  onEdit: () => void;
  onDeleted: () => void;
};

type AccountSettingsOwnProps = {
  accounts: AccountUsageDTO[];
};

/**
 * Menyusun keterangan singkat sebuah akun untuk baris daftar: detail bank pada
 * akun BANK, dan label Cash pada akun tunai.
 * @param {AccountUsageDTO} account - Akun yang ditampilkan.
 * @returns {string} Keterangan singkat akun.
 */
function getAccountDescription(account: AccountUsageDTO) {
  if (account.type !== 'BANK') return 'Cash';

  return [account.bankName, account.accountNumber].filter(Boolean).join(' • ') || 'Rekening bank';
}

/**
 * Satu baris akun pada daftar pengaturan, lengkap dengan aksi ubah dan
 * nonaktifkan. Tombol nonaktifkan hanya muncul untuk akun yang masih aktif, dan
 * dialog konfirmasinya menegaskan bahwa transaksi lama tetap tersimpan.
 * @param {AccountRowOwnProps} props - Props komponen.
 * @param {AccountUsageDTO} props.account - Akun beserta jumlah transaksinya.
 * @param {() => void} props.onEdit - Dijalankan saat pengguna menekan tombol ubah.
 * @param {() => void} props.onDeleted - Dijalankan setelah akun berhasil dinonaktifkan.
 * @returns {ReactNode} Baris akun beserta dialog konfirmasinya.
 */
function AccountRow({ account, onEdit, onDeleted }: AccountRowOwnProps) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useApiMutation(accountApi.remove);

  const removalDescription = account.transactionCount
    ? `${account.transactionCount} transaksi yang sudah menggunakan akun ini tetap tersimpan.`
    : 'Akun ini belum dipakai transaksi mana pun.';

  async function handleConfirm() {
    const deleted = await run(account.uuid);
    setConfirming(false);
    if (deleted) onDeleted();
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 transition-colors hover:bg-gray-50">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700" style={{ backgroundColor: account.color ?? '#F1F1F1' }}>
        <DynamicIcon icon={ACCOUNT_TYPE_ICON[account.type]} fontSize="18px" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-800">{account.name}</p>

          {!account.isActive && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">Nonaktif</span>}
        </div>

        <p className="truncate text-[11px] text-gray-400">{getAccountDescription(account)}</p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-bold text-gray-800">{formatIDR(account.balance)}</p>
        <p className="text-[10px] text-gray-400">{account.transactionCount} transaksi</p>
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
          onClick={() => setConfirming(true)}
          disabled={pending}
          aria-label={`Nonaktifkan akun ${account.name}`}
          className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          <DynamicIcon icon="ph:trash" fontSize="16px" />
        </button>
      )}

      <ConfirmModal
        open={confirming}
        icon="ph:trash"
        title={`Nonaktifkan akun "${account.name}"?`}
        description={removalDescription}
        confirmLabel="Ya, nonaktifkan"
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </li>
  );
}

/**
 * Pengaturan akun rekening: daftar akun aktif per jenis beserta panel isian
 * untuk menambah maupun mengubahnya. Panel dipakai bergantian untuk kedua mode
 * supaya pesan error dan state pending-nya tunggal.
 * @param {AccountSettingsOwnProps} props - Props komponen.
 * @param {AccountUsageDTO[]} props.accounts - Seluruh akun beserta jumlah transaksinya.
 * @returns {ReactNode} Daftar akun rekening beserta panel isiannya.
 */
export default function AccountSettings({ accounts }: AccountSettingsOwnProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_ACCOUNT_FORM);

  const save = useCallback((uuid: string | null, input: AccountInput) => (uuid ? accountApi.update(uuid, input) : accountApi.create(input)), []);

  const { run, pending, error, fieldErrors, reset } = useApiMutation(save);

  function openCreateSheet(type: AccountType) {
    setEditingUuid(null);
    setForm({ ...EMPTY_ACCOUNT_FORM, type });
    reset();
    setOpen(true);
  }

  function openEditSheet(account: AccountUsageDTO) {
    setEditingUuid(account.uuid);
    setForm({
      name: account.name,
      type: account.type,
      color: account.color ?? ENTITY_COLORS[0],
      bankName: account.bankName ?? '',
      accountNumber: account.accountNumber ?? '',
      openingBalance: account.openingBalance,
    });
    reset();
    setOpen(true);
  }

  function setAccountType(type: AccountType) {
    setForm(_previous => ({
      ..._previous,
      type,
      ...(type === 'CASH' ? { bankName: '', accountNumber: '' } : {}),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const input: AccountInput = {
      name: form.name,
      type: form.type,
      color: form.color,
      bankName: form.type === 'BANK' ? form.bankName : null,
      accountNumber: form.type === 'BANK' ? form.accountNumber : null,
      openingBalance: form.openingBalance,
    };

    const saved = await run(editingUuid, input);
    if (!saved) return;

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {ACCOUNT_TYPES.map(_type => {
        const items = accounts.filter(_account => _account.type === _type && _account.isActive);

        return (
          <div key={`account_settings__group_${_type}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">{ACCOUNT_TYPE_LABEL[_type]}</h3>

              <button
                type="button"
                onClick={() => openCreateSheet(_type)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-theme-accent hover:text-gray-900"
              >
                <DynamicIcon icon="ph:plus" fontSize="14px" />
                Tambah
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={ACCOUNT_TYPE_ICON[_type]}
                title={`Belum ada akun ${ACCOUNT_TYPE_LABEL[_type].toLowerCase()}`}
                description={_type === 'CASH' ? 'Tambahkan akun untuk mencatat uang tunai yang kamu miliki.' : 'Tambahkan rekening bank yang kamu gunakan.'}
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(_account => (
                  <AccountRow key={`account_settings__row_${_account.uuid}`} account={_account} onEdit={() => openEditSheet(_account)} onDeleted={() => router.refresh()} />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <Sheet open={open} title={editingUuid ? 'Ubah Akun' : 'Tambah Akun'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {ACCOUNT_TYPES.map(_option => (
              <button
                key={`account_settings__type_${_option}`}
                type="button"
                onClick={() => setAccountType(_option)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-colors ${form.type === _option ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                <DynamicIcon icon={ACCOUNT_TYPE_ICON[_option]} fontSize="16px" />
                {ACCOUNT_TYPE_LABEL[_option]}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label="Nama Akun"
            required
            maxLength={100}
            placeholder={form.type === 'CASH' ? 'Misalnya: Dompet' : 'Misalnya: Rekening Utama'}
            value={form.name}
            onChange={event => setForm(_previous => ({ ..._previous, name: event.target.value }))}
            errors={fieldErrors.name}
          />

          {form.type === 'BANK' && (
            <>
              <Input
                label="Nama Bank"
                required
                maxLength={100}
                placeholder="Misalnya: BCA"
                value={form.bankName}
                onChange={event => setForm(_previous => ({ ..._previous, bankName: event.target.value }))}
                errors={fieldErrors.bankName}
              />

              <Input
                label="Nomor Rekening"
                maxLength={100}
                placeholder="Misalnya: 1234567890"
                value={form.accountNumber}
                onChange={event => setForm(_previous => ({ ..._previous, accountNumber: event.target.value }))}
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
            onChange={event => setForm(_previous => ({ ..._previous, openingBalance: event.target.value }))}
            errors={fieldErrors.openingBalance}
          />

          {editingUuid && (
            <p className="-mt-2 text-xs leading-relaxed text-gray-400">Perubahan saldo awal akan menyesuaikan saldo akun berdasarkan selisih dari saldo awal sebelumnya.</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Warna</label>

            <div className="flex flex-wrap gap-2">
              {ENTITY_COLORS.map(_color => (
                <button
                  key={`account_settings__color_${_color}`}
                  type="button"
                  onClick={() => setForm(_previous => ({ ..._previous, color: _color }))}
                  aria-label={`Warna ${_color}`}
                  aria-pressed={form.color === _color}
                  style={{ backgroundColor: _color }}
                  className={`h-9 w-9 rounded-full transition-transform ${form.color === _color ? 'ring-2 ring-gray-800 ring-offset-2' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
