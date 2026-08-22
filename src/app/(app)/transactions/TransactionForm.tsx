'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Input, Select, type SelectOption } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { Sheet } from '@/src/components/ui/Sheet';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { transactionApi } from '@/src/lib/transactions/TransactionApi';
import { syncSavedTransactionToCache } from '@/src/lib/transactions/TransactionQueryCache';
import { toTransactionInput, type TransactionFormState } from '@/src/lib/transactions/TransactionFormState';
import type { CategoryDTO } from '@/src/lib/categories/CategoryService';
import type { AccountDTO } from '@/src/lib/accounts/AccountService';
import type { TransactionInput } from '@/src/lib/transactions/TransactionValidator';

type TransactionType = TransactionFormState['type'];

/**
 * Menyusun opsi select dari daftar akun. Akun bank diberi keterangan nama bank
 * dan nomor rekening supaya dua akun dengan nama mirip tetap dapat dibedakan.
 * @param {AccountDTO[]} accounts - Akun yang akan dijadikan opsi.
 * @returns {SelectOption[]} Opsi select siap pakai.
 */
function toAccountOptions(accounts: AccountDTO[]): SelectOption[] {
  return accounts.map(_account => ({
    value: _account.uuid,
    label: _account.name,
    description: _account.type === 'BANK' ? [_account.bankName, _account.accountNumber].filter(Boolean).join(' • ') : 'Cash',
    icon: _account.type === 'BANK' ? 'ph:bank' : 'ph:wallet',
    color: _account.color ?? '#F1F1F1',
  }));
}

const TRANSACTION_TYPE_OPTIONS: ReadonlyArray<{ value: TransactionType; label: string }> = [
  { value: 'EXPENSE', label: 'Pengeluaran' },
  { value: 'INCOME', label: 'Pemasukan' },
  { value: 'TRANSFER', label: 'Transfer' },
];

type TransactionFormOwnProps = {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  editingUuid: string | null;
  initialState: TransactionFormState;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Panel isian transaksi yang dipakai untuk dua mode sekaligus: menambah saat
 * `editingUuid` bernilai null, dan mengubah saat berisi uuid. Komponen ini
 * terkontrol penuh oleh pemanggilnya, dan panel dianggap terbuka selama ia
 * dirender, sehingga pemanggil cukup memasangnya secara kondisional dan state
 * isian selalu segar tanpa perlu disinkronkan lewat useEffect. Daftar kategori
 * disaring mengikuti jenis transaksi, dan pilihan kategori dilepas saat
 * jenisnya berganti supaya kategori dari jenis lain tidak ikut terbawa.
 * @param {TransactionFormOwnProps} props - Props komponen.
 * @param {CategoryDTO[]} props.categories - Seluruh kategori milik pengguna.
 * @param {AccountDTO[]} props.accounts - Seluruh akun aktif milik pengguna.
 * @param {string | null} props.editingUuid - UUID transaksi yang diubah, atau null untuk transaksi baru.
 * @param {TransactionFormState} props.initialState - Nilai awal isian saat panel dibuka.
 * @param {() => void} props.onClose - Dijalankan saat panel diminta ditutup.
 * @param {() => void} props.onSaved - Dijalankan setelah transaksi berhasil disimpan.
 * @returns {ReactNode} Panel isian transaksi.
 */
export default function TransactionForm({ categories, accounts, editingUuid, initialState, onClose, onSaved }: TransactionFormOwnProps) {
  const [form, setForm] = useState<TransactionFormState>(initialState);

  const save = useCallback((uuid: string | null, input: TransactionInput) => (uuid ? transactionApi.update(uuid, input) : transactionApi.create(input)), []);

  const { run, pending, error, fieldErrors } = useApiMutation(save, {
    invalidateKeys: [['transactions']],
    updateCache: syncSavedTransactionToCache,
  });

  const isTransfer = form.type === 'TRANSFER';
  const visibleCategories = useMemo(() => categories.filter(_category => _category.type === form.type), [categories, form.type]);
  const sourceOptions = useMemo(() => toAccountOptions(accounts), [accounts]);
  const destinationOptions = useMemo(() => toAccountOptions(accounts.filter(_account => _account.uuid !== form.accountUuid)), [accounts, form.accountUuid]);

  function setSourceAccount(accountUuid: string) {
    setForm(_previous => ({
      ..._previous,
      accountUuid,
      toAccountUuid: _previous.toAccountUuid === accountUuid ? null : _previous.toAccountUuid,
    }));
  }

  function setTransactionType(type: TransactionType) {
    setForm(_previous => ({
      ..._previous,
      type,
      categoryUuid: null,
      toAccountUuid: type === 'TRANSFER' ? _previous.toAccountUuid : null,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const saved = await run(editingUuid, toTransactionInput(form));
    if (!saved) return;

    onSaved();
  }

  return (
    <Sheet open title={editingUuid ? 'Ubah Transaksi' : 'Tambah Transaksi'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
          {TRANSACTION_TYPE_OPTIONS.map(_option => (
            <button
              key={`transaction_form__type_${_option.value}`}
              type="button"
              onClick={() => setTransactionType(_option.value)}
              className={`rounded-lg py-2 text-sm font-bold transition-colors ${form.type === _option.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
              {_option.label}
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
          value={form.amount}
          onChange={event => setForm(_previous => ({ ..._previous, amount: event.target.value }))}
          errors={fieldErrors.amount}
        />

        <Select
          label="Kategori"
          value={form.categoryUuid ?? ''}
          onChange={value => setForm(_previous => ({ ..._previous, categoryUuid: value }))}
          errors={fieldErrors.categoryUuid}
          placeholder="Tanpa kategori"
          searchPlaceholder="Cari kategori..."
          options={visibleCategories.map(_category => ({
            value: _category.uuid,
            label: _category.name,
            icon: _category.icon ?? 'ph:circle-dashed',
            color: _category.color ?? '#F1F1F1',
          }))}
        />

        <Select
          label={isTransfer ? 'Akun Sumber' : 'Akun Rekening'}
          value={form.accountUuid}
          onChange={setSourceAccount}
          errors={fieldErrors.accountUuid}
          placeholder="Pilih akun"
          searchPlaceholder="Cari akun..."
          options={sourceOptions}
        />

        {isTransfer && (
          <Select
            label="Akun Tujuan"
            value={form.toAccountUuid ?? ''}
            onChange={value => setForm(_previous => ({ ..._previous, toAccountUuid: value }))}
            errors={fieldErrors.toAccountUuid}
            placeholder="Pilih akun tujuan"
            searchPlaceholder="Cari akun..."
            hint="Saldo berpindah dari akun sumber ke akun tujuan."
            options={destinationOptions}
          />
        )}

        <Input
          label="Tanggal"
          type="date"
          required
          value={form.occurredAt}
          onChange={event => setForm(_previous => ({ ..._previous, occurredAt: event.target.value }))}
          errors={fieldErrors.occurredAt}
        />

        <Input
          label="Catatan"
          placeholder="Opsional"
          maxLength={255}
          value={form.note ?? ''}
          onChange={event => setForm(_previous => ({ ..._previous, note: event.target.value }))}
          errors={fieldErrors.note}
        />

        <Button type="submit" fullWidth disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Sheet>
  );
}
