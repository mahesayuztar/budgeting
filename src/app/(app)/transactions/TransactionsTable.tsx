'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Money } from '@/src/components/ui/Money';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { DataTable, type AppColumnDef } from '@/src/components/ui/DataTable';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { transactionApi } from '@/src/lib/transactions/TransactionApi';
import { formatDateID, formatDateShort } from '@/src/helpers/DateHelper';
import type { TransactionDTO } from '@/src/lib/transactions/TransactionService';
import type { Page } from '@/src/helpers/PaginationHelper';

type DeleteButtonOwnProps = {
  uuid: string;
  onDone: () => void;
};

type TransactionsTableOwnProps = {
  year: number;
  month: number;
  initialPage: Page<TransactionDTO>;
};

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
 * Tabel transaksi satu periode dengan pencarian dan gulir tak hingga. Tanggal
 * dan catatan punya kolom sendiri pada layar lebar, sedangkan pada layar sempit
 * keduanya menumpang di sel kategori supaya tabel tetap terbaca.
 * @param {TransactionsTableOwnProps} props - Props komponen.
 * @param {number} props.year - Tahun periode yang ditampilkan.
 * @param {number} props.month - Bulan periode yang ditampilkan dengan Januari bernilai 1.
 * @param {Page<TransactionDTO>} props.initialPage - Halaman pertama hasil render server.
 * @returns {ReactNode} Tabel transaksi periode tersebut.
 */
export default function TransactionsTable({ year, month, initialPage }: TransactionsTableOwnProps) {
  const router = useRouter();

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
        cell: ({ row }) => <DeleteButton uuid={row.original.uuid} onDone={refresh} />,
        meta: { className: 'w-10 text-right', headerClassName: 'w-10' },
      },
    ];
  }, [router]);

  return (
    <DataTable
      queryKey={['transactions', year, month]}
      initialPage={initialPage}
      fetchPage={({ cursor, q }) => transactionApi.list({ year, month, cursor, q })}
      columns={columns}
      getRowId={_row => _row.uuid}
      searchPlaceholder="Cari catatan atau kategori..."
      emptyIcon="ph:receipt"
      emptyTitle="Belum ada transaksi"
      emptyDescription="Gunakan tombol Tambah Transaksi untuk mengisi."
    />
  );
}
