'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Money } from '@/src/components/ui/Money';
import { Button } from '@/src/components/ui/Button';
import { Sheet } from '@/src/components/ui/Sheet';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { DataTable, type AppColumnDef, type DataTableFilter } from '@/src/components/ui/DataTable';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { transactionApi } from '@/src/lib/transactions/TransactionApi';
import { toTransactionFormState } from '@/src/lib/transactions/TransactionFormState';
import { formatDateID, formatDateShort } from '@/src/helpers/DateHelper';
import TransactionForm from './TransactionForm';
import type { TransactionDTO } from '@/src/lib/transactions/TransactionService';
import type { CategoryDTO } from '@/src/lib/categories/CategoryService';
import type { AccountDTO } from '@/src/lib/accounts/AccountService';
import type { Page } from '@/src/helpers/PaginationHelper';

type DeleteButtonOwnProps = {
  uuid: string;
  onDone: () => void;
};

type TransactionsTableOwnProps = {
  year: number;
  month: number;
  initialPage: Page<TransactionDTO>;
  categories: CategoryDTO[];
  accounts: AccountDTO[];
};

const TRANSACTION_TYPE_FILTER_OPTIONS = [
  { value: 'INCOME', label: 'Pemasukan', icon: 'ph:arrow-down-left', color: '#DCFCE7' },
  { value: 'EXPENSE', label: 'Pengeluaran', icon: 'ph:arrow-up-right', color: '#FEE2E2' },
  { value: 'TRANSFER', label: 'Transfer', icon: 'ph:arrows-left-right', color: '#DBEAFE' },
] as const;

/**
 * Tombol hapus satu baris transaksi beserta dialog konfirmasinya. Daftar
 * transaksi di-invalidate otomatis oleh `useApiMutation`, sehingga callback
 * `onDone` hanya perlu menyegarkan bagian halaman yang dirender di server.
 * @param {DeleteButtonOwnProps} props - Props komponen.
 * @param {string} props.uuid - UUID transaksi yang akan dihapus.
 * @param {() => void} props.onDone - Dijalankan setelah transaksi berhasil dihapus.
 * @returns {ReactNode} Tombol hapus beserta dialog konfirmasinya.
 */
function DeleteButton({ uuid, onDone }: DeleteButtonOwnProps) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useApiMutation(transactionApi.remove, {
    invalidateKeys: [['transactions']],
  });

  async function handleConfirm() {
    const deleted = await run(uuid);
    setConfirming(false);
    if (deleted) onDone();
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label="Hapus transaksi"
        onClick={() => setConfirming(true)}
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <DynamicIcon icon="ph:trash" fontSize="16px" />
      </button>

      <ConfirmModal
        open={confirming}
        icon="ph:trash"
        title="Hapus transaksi ini?"
        description="Transaksi yang sudah dihapus tidak dapat dikembalikan."
        confirmLabel="Ya, hapus"
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/**
 * Tabel transaksi satu periode dengan pencarian dan gulir tak hingga. Setiap
 * baris menyediakan tiga aksi: melihat rincian lengkap, mengubah, dan
 * menghapus. Panel rincian dan panel ubah hanya dipasang saat ada transaksi
 * terpilih, sehingga isinya selalu mengikuti baris yang baru saja ditekan.
 * Tanggal dan catatan punya kolom sendiri pada layar lebar, sedangkan pada
 * layar sempit keduanya menumpang di sel kategori supaya tabel tetap terbaca.
 * @param {TransactionsTableOwnProps} props - Props komponen.
 * @param {number} props.year - Tahun periode yang ditampilkan.
 * @param {number} props.month - Bulan periode yang ditampilkan dengan Januari bernilai 1.
 * @param {Page<TransactionDTO>} props.initialPage - Halaman pertama hasil render server.
 * @param {CategoryDTO[]} props.categories - Seluruh kategori milik pengguna, dipakai panel ubah.
 * @param {AccountDTO[]} props.accounts - Seluruh akun aktif milik pengguna, dipakai panel ubah.
 * @returns {ReactNode} Tabel transaksi beserta panel rincian dan panel ubahnya.
 */
export default function TransactionsTable({ year, month, initialPage, categories, accounts }: TransactionsTableOwnProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<TransactionDTO | null>(null);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);

  const filters = useMemo<DataTableFilter[]>(
    () => [
      {
        id: 'type',
        label: 'Tipe',
        allLabel: 'Semua tipe',
        options: TRANSACTION_TYPE_FILTER_OPTIONS,
      },
      {
        id: 'categoryUuid',
        label: 'Kategori',
        allLabel: 'Semua kategori',
        parentId: 'type',
        options: categories.map(_category => ({
          value: _category.uuid,
          label: _category.name,
          description: _category.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
          parentValue: _category.type,
          icon: _category.icon ?? 'ph:circle-dashed',
          color: _category.color ?? '#F1F1F1',
        })),
      },
      {
        id: 'accountUuid',
        label: 'Akun',
        allLabel: 'Semua akun',
        options: accounts.map(_account => ({
          value: _account.uuid,
          label: _account.name,
          description: _account.type === 'BANK' ? (_account.bankName ?? 'Rekening bank') : 'Cash',
          icon: _account.type === 'BANK' ? 'ph:bank' : 'ph:wallet',
          color: _account.color ?? '#F1F1F1',
        })),
      },
    ],
    [categories, accounts],
  );

  function openEditFromDetail(transaction: TransactionDTO) {
    setDetail(null);
    setEditing(transaction);
  }

  function handleSaved() {
    setEditing(null);
    router.refresh();
  }

  const columns = useMemo<AppColumnDef<TransactionDTO>[]>(() => {
    const refresh = () => router.refresh();

    return [
      {
        id: 'category',
        header: 'Kategori',
        meta: { className: 'w-[30vw]' },
        cell: ({ row }) => {
          const item = row.original;

          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700" style={{ backgroundColor: item.category?.color ?? '#F1F1F1' }}>
                <DynamicIcon icon={item.category?.icon ?? 'ph:circle-dashed'} fontSize="16px" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800">{item.category?.name ?? 'Tanpa Kategori'}</p>
                <p className="truncate text-[11px] text-gray-400 md:hidden">
                  {formatDateShort(item.occurredAt)}
                  {item.note ? ` · ${item.note}` : ''}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'occurredAt',
        header: 'Tanggal',
        cell: ({ row }) => <span className="whitespace-nowrap text-xs text-gray-500">{formatDateID(row.original.occurredAt)}</span>,
        meta: { className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell' },
      },
      {
        id: 'note',
        header: 'Catatan',
        cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.note || '-'}</span>,
        meta: { className: 'hidden lg:table-cell lg:w-[20vw]', headerClassName: 'hidden lg:table-cell lg:w-[20vw]' },
      },
      {
        id: 'type',
        header: 'Tipe',
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.original.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {row.original.type === 'INCOME' ? 'Masuk' : 'Keluar'}
          </span>
        ),
        meta: { className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell' },
      },
      {
        id: 'amount',
        header: 'Jumlah',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-bold">
            <Money value={row.original.amount} tone={row.original.type === 'INCOME' ? 'income' : 'expense'} />
          </span>
        ),
        meta: { className: 'text-right', headerClassName: 'text-right' },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setDetail(row.original)}
              aria-label="Lihat detail transaksi"
              className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <DynamicIcon icon="ph:eye" fontSize="16px" />
            </button>

            <button
              type="button"
              onClick={() => setEditing(row.original)}
              aria-label="Ubah transaksi"
              className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
            </button>

            <DeleteButton uuid={row.original.uuid} onDone={refresh} />
          </div>
        ),
        meta: { className: 'w-28 text-right', headerClassName: 'w-28' },
      },
    ];
  }, [router]);

  return (
    <>
      <DataTable
        queryKey={['transactions', year, month]}
        initialPage={initialPage}
        filters={filters}
        filterTitle="Filter transaksi"
        fetchPage={({ cursor, q, filters: _filters }) =>
          transactionApi.list({
            year,
            month,
            cursor,
            q,
            type: _filters.type as 'INCOME' | 'EXPENSE' | 'TRANSFER' | undefined,
            categoryUuid: _filters.categoryUuid,
            accountUuid: _filters.accountUuid,
          })
        }
        columns={columns}
        getRowId={_row => _row.uuid}
        searchPlaceholder="Cari catatan atau kategori..."
        emptyIcon="ph:receipt"
        emptyTitle="Belum ada transaksi"
        emptyDescription="Gunakan tombol Tambah Transaksi untuk mengisi."
      />

      {detail && (
        <Sheet open title="Detail Transaksi" onClose={() => setDetail(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-theme-light px-4 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700" style={{ backgroundColor: detail.category?.color ?? '#F1F1F1' }}>
                <DynamicIcon icon={detail.category?.icon ?? 'ph:circle-dashed'} fontSize="20px" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-800">{detail.category?.name ?? 'Tanpa Kategori'}</p>
                <p className="text-lg font-bold">
                  <Money value={detail.amount} tone={detail.type === 'INCOME' ? 'income' : 'expense'} />
                </p>
              </div>
            </div>

            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-gray-500">Tipe</dt>
                <dd className="text-right font-semibold text-gray-800">{detail.type === 'INCOME' ? 'Pemasukan' : detail.type === 'EXPENSE' ? 'Pengeluaran' : 'Transfer'}</dd>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                <dt className="shrink-0 text-gray-500">{detail.type === 'TRANSFER' ? 'Akun Sumber' : 'Akun'}</dt>
                <dd className="min-w-0 break-words text-right font-semibold text-gray-800">{detail.account?.name ?? '-'}</dd>
              </div>

              {detail.type === 'TRANSFER' && (
                <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                  <dt className="shrink-0 text-gray-500">Akun Tujuan</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-gray-800">{detail.toAccount?.name ?? '-'}</dd>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                <dt className="shrink-0 text-gray-500">Tanggal</dt>
                <dd className="text-right font-semibold text-gray-800">{formatDateID(detail.occurredAt)}</dd>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                <dt className="shrink-0 text-gray-500">Catatan</dt>
                <dd className="min-w-0 break-words text-right font-semibold text-gray-800">{detail.note || '-'}</dd>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                <dt className="shrink-0 text-gray-500">ID Transaksi</dt>
                <dd className="min-w-0 break-all text-right font-mono text-[11px] text-gray-400">{detail.uuid}</dd>
              </div>
            </dl>

            <Button type="button" variant="secondary" fullWidth onClick={() => openEditFromDetail(detail)}>
              <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
              Ubah Transaksi
            </Button>
          </div>
        </Sheet>
      )}

      {editing && (
        <TransactionForm
          categories={categories}
          accounts={accounts}
          editingUuid={editing.uuid}
          initialState={toTransactionFormState(editing)}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
