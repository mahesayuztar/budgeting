'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { Sheet } from '@/src/components/ui/Sheet';
import { AddButton } from '@/src/components/ui/AddButton';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { transactionApi } from '@/src/lib/transactions/TransactionApi';
import { toDateInputValue } from '@/src/helpers/DateHelper';
import type { CategoryDTO } from '@/src/lib/categories/CategoryService';
import type { AccountDTO } from '@/src/lib/accounts/AccountService';

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

const TRANSACTION_TYPE_OPTIONS: ReadonlyArray<{ value: TransactionType; label: string }> = [
  { value: 'EXPENSE', label: 'Pengeluaran' },
  { value: 'INCOME', label: 'Pemasukan' },
  { value: 'TRANSFER', label: 'Transfer' },
];

type TransactionFormOwnProps = {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
};

/**
 * Form pencatatan transaksi baru dalam bentuk panel yang dipicu tombol tambah.
 * Daftar kategori disaring mengikuti jenis transaksi yang dipilih, dan pilihan
 * kategori direset saat jenisnya berganti supaya kategori dari jenis lain tidak
 * ikut terbawa. Setelah tersimpan, halaman disegarkan agar kartu ringkasan yang
 * dirender di server ikut memperbarui angkanya.
 * @param {TransactionFormOwnProps} props - Props komponen.
 * @param {CategoryDTO[]} props.categories - Seluruh kategori milik pengguna.
 * @param {AccountDTO[]} props.accounts - Seluruh akun aktif milik pengguna.
 * @returns {ReactNode} Tombol tambah beserta panel form transaksinya.
 */
export default function TransactionForm({ categories, accounts }: TransactionFormOwnProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryUuid, setCategoryUuid] = useState('');
  const [accountUuid, setAccountUuid] = useState(accounts?.[0]?.uuid ?? '');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => toDateInputValue(new Date()));

  const { run, pending, error, fieldErrors, reset } = useApiMutation(transactionApi.create, { invalidateKeys: [['transactions']] });

  const visibleCategories = useMemo(() => categories.filter(_category => _category.type === type), [categories, type]);

  function handleClose() {
    setOpen(false);
    reset();
  }

  function setTransactionType(next: TransactionType) {
    setType(next);
    setCategoryUuid('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await run({
      type,
      amount: Number(amount),
      categoryUuid: categoryUuid || null,
      note: note || null,
      occurredAt,
    });

    if (!created) return;

    setAmount('');
    setNote('');
    setCategoryUuid('');
    handleClose();
    router.refresh();
  }

  return (
    <>
      <AddButton label="Tambah Transaksi" onClick={() => setOpen(true)} />

      <Sheet open={open} title="Tambah Transaksi" onClose={handleClose}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
            {TRANSACTION_TYPE_OPTIONS.map(_option => (
              <button
                key={`transaction_form__type_${_option.value}`}
                type="button"
                onClick={() => setTransactionType(_option.value)}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${type === _option.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
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
            value={amount}
            onChange={event => setAmount(event.target.value)}
            errors={fieldErrors.amount}
          />

          <Select
            label="Kategori"
            value={categoryUuid}
            onChange={setCategoryUuid}
            errors={fieldErrors.categoryUuid}
            placeholder="Tanpa kategori"
            searchPlaceholder="Cari kategori..."
            options={visibleCategories.map(_category => ({
              value: _category.uuid,
              label: _category.name,
            }))}
          />

          <Select
            label="Akun Rekening"
            value={accountUuid}
            onChange={setAccountUuid}
            errors={fieldErrors.accountUuid}
            placeholder="Pilih akun"
            searchPlaceholder="Cari akun..."
            options={accounts.map(_account => ({
              value: _account.uuid,
              label: _account.name,
              description: _account.type === 'BANK' ? [_account.bankName, _account.accountNumber].filter(Boolean).join(' • ') : 'Cash',
            }))}
          />

          <Input label="Tanggal" type="date" required value={occurredAt} onChange={event => setOccurredAt(event.target.value)} errors={fieldErrors.occurredAt} />

          <Input label="Catatan" placeholder="Opsional" maxLength={255} value={note} onChange={event => setNote(event.target.value)} errors={fieldErrors.note} />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
