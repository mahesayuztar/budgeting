'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddButton } from '@/src/components/ui/AddButton';
import { createEmptyTransactionForm } from '@/src/lib/transactions/TransactionFormState';
import TransactionForm from './TransactionForm';
import type { CategoryDTO } from '@/src/lib/categories/CategoryService';
import type { AccountDTO } from '@/src/lib/accounts/AccountService';

type TransactionCreateButtonOwnProps = {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
};

/**
 * Tombol tambah transaksi beserta panel isiannya. Komponen ini menjadi batas
 * klien untuk halaman transaksi yang dirender di server, dan panel isian hanya
 * dipasang saat sedang terbuka supaya isinya selalu kembali kosong setiap kali
 * dibuka ulang. Setelah tersimpan, halaman disegarkan agar kartu ringkasan yang
 * dirender di server ikut memperbarui angkanya.
 * @param {TransactionCreateButtonOwnProps} props - Props komponen.
 * @param {CategoryDTO[]} props.categories - Seluruh kategori milik pengguna.
 * @param {AccountDTO[]} props.accounts - Seluruh akun aktif milik pengguna.
 * @returns {ReactNode} Tombol tambah transaksi beserta panel isiannya.
 */
export default function TransactionCreateButton({ categories, accounts }: TransactionCreateButtonOwnProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSaved() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <AddButton label="Tambah Transaksi" onClick={() => setOpen(true)} />

      {open && (
        <TransactionForm
          categories={categories}
          accounts={accounts}
          editingUuid={null}
          initialState={createEmptyTransactionForm(accounts[0]?.uuid)}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
