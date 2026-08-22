'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { DataTable, type AppColumnDef, type DataTableFilter } from '@/src/components/ui/DataTable';
import { Money } from '@/src/components/ui/Money';
import { useToast } from '@/src/components/ui/Toast';
import { formatDateID, formatDateShort } from '@/src/helpers/DateHelper';
import type { Page } from '@/src/helpers/PaginationHelper';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { splitBillApi } from '@/src/lib/split-bills/SplitBillApi';
import type { SplitBillListDTO } from '@/src/lib/split-bills/SplitBillDto';
import { removeSplitBillFromCache } from '@/src/lib/split-bills/SplitBillQueryCache';

type SplitBillHistoryOwnProps = {
  year: number;
  month: number;
  initialPage: Page<SplitBillListDTO>;
};

const STATUS_FILTERS: readonly DataTableFilter[] = [
  {
    id: 'status',
    label: 'Status',
    allLabel: 'Semua status',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'FINALIZED', label: 'Final' },
    ],
  },
];

function StatusBadge({ status }: { status: SplitBillListDTO['status'] }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
      {status === 'FINALIZED' ? 'Final' : 'Draft'}
    </span>
  );
}

function AssignmentProgress({ bill }: { bill: SplitBillListDTO }) {
  const complete = bill.itemCount > 0 && bill.completedItemCount === bill.itemCount;
  return (
    <div className="min-w-24">
      <p className={`text-xs font-bold ${complete ? 'text-emerald-600' : 'text-gray-600'}`}>
        {bill.completedItemCount}/{bill.itemCount} item
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-theme-primary'}`}
          style={{ width: `${bill.itemCount ? (bill.completedItemCount / bill.itemCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/** History interaktif dengan pencarian, filter status, duplicate, dan delete. */
export default function SplitBillHistory({ year, month, initialPage }: SplitBillHistoryOwnProps) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<SplitBillListDTO | null>(null);
  const duplicate = useApiMutation((uuid: string) => splitBillApi.duplicate(uuid, { mode: 'FULL' }), { invalidateKeys: [['split-bills']] });
  const removal = useApiMutation(splitBillApi.remove, {
    invalidateKeys: [['split-bills']],
    updateCache: queryClient => {
      if (deleting) removeSplitBillFromCache(queryClient, deleting.uuid);
    },
  });

  useEffect(() => {
    const message = duplicate.error ?? removal.error;
    if (message) toast.error('Aksi tagihan gagal', { description: message });
  }, [duplicate.error, removal.error, toast]);

  async function handleDuplicate(bill: SplitBillListDTO) {
    const copy = await duplicate.run(bill.uuid);
    if (!copy) return;
    toast.success('Tagihan berhasil disalin', { description: 'Salinan baru disimpan sebagai Draft.' });
    router.push(`/bills/split/${copy.uuid}`);
    router.refresh();
  }

  async function handleRemove() {
    if (!deleting) return;
    const deleted = await removal.run(deleting.uuid);
    if (!deleted) return;
    setDeleting(null);
    toast.success('Tagihan dihapus', { description: `${deleting.title} beserta seluruh rinciannya telah dihapus.` });
    router.refresh();
  }

  const columns: AppColumnDef<SplitBillListDTO>[] = [
    {
      id: 'bill',
      header: 'Tagihan',
      cell: ({ row }) => (
        <div className="min-w-44">
          <Link
            href={row.original.status === 'DRAFT' ? `/bills/split/${row.original.uuid}/edit` : `/bills/split/${row.original.uuid}`}
            className="font-bold text-gray-800 hover:text-theme-light-border"
          >
            {row.original.title}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-gray-400">{row.original.merchantName ?? `${row.original.participantCount} peserta`}</p>
        </div>
      ),
    },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => <span className="whitespace-nowrap text-xs text-gray-500">{formatDateShort(row.original.occurredAt)}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'progress', header: 'Terbagi', cell: ({ row }) => <AssignmentProgress bill={row.original} /> },
    {
      id: 'total',
      header: 'Total',
      meta: { className: 'text-right', headerClassName: 'text-right' },
      cell: ({ row }) => <Money value={row.original.grandTotal} className="whitespace-nowrap font-bold" />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          {row.original.status === 'DRAFT' && (
            <Link
              href={`/bills/split/${row.original.uuid}/edit`}
              aria-label={`Ubah ${row.original.title}`}
              title="Ubah tagihan"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-theme-light hover:text-gray-700"
            >
              <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
            </Link>
          )}
          <button
            type="button"
            disabled={duplicate.pending}
            onClick={() => void handleDuplicate(row.original)}
            aria-label={`Duplikat ${row.original.title}`}
            title="Duplikat lengkap"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-theme-light hover:text-gray-700 disabled:opacity-40"
          >
            <DynamicIcon icon="ph:copy" fontSize="16px" />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(row.original)}
            aria-label={`Hapus ${row.original.title}`}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
          >
            <DynamicIcon icon="ph:trash" fontSize="16px" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        queryKey={['split-bills', year, month]}
        initialPage={initialPage}
        fetchPage={({ cursor, q, filters }) => splitBillApi.list({ year, month, cursor, q, status: filters.status as 'DRAFT' | 'FINALIZED' | undefined })}
        columns={columns}
        getRowId={bill => bill.uuid}
        filters={STATUS_FILTERS}
        filterTitle="Filter riwayat"
        searchPlaceholder="Cari tagihan, tempat, atau peserta..."
        emptyIcon="ph:receipt"
        emptyTitle="Belum ada pembagian tagihan"
        emptyDescription="Buat tagihan pertama dan bagi setiap unit ke orang yang tepat."
        tableClassName="min-w-[760px]"
        renderExpandedRow={bill => (
          <div className="mb-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:mx-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase text-gray-400">Tanggal</p>
                <p className="mt-1 font-semibold text-gray-700">{formatDateID(bill.occurredAt)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Peserta</p>
                <p className="mt-1 font-semibold text-gray-700">{bill.participantCount} orang</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Progress</p>
                <p className="mt-1 font-semibold text-gray-700">
                  {bill.completedItemCount} dari {bill.itemCount} item
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Diperbarui</p>
                <p className="mt-1 font-semibold text-gray-700">{formatDateID(bill.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      />

      <ConfirmModal
        open={Boolean(deleting)}
        icon="ph:trash"
        title={`Hapus ${deleting?.title ?? 'tagihan'}?`}
        description="Item, peserta, pembagian, dan adjustment di dalamnya ikut dihapus permanen."
        confirmLabel="Ya, hapus"
        pending={removal.pending}
        onConfirm={() => void handleRemove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
