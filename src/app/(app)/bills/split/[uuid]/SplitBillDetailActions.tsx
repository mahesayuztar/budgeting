'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { useToast } from '@/src/components/ui/Toast';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { splitBillApi } from '@/src/lib/split-bills/SplitBillApi';

type SplitBillDetailActionsOwnProps = {
  uuid: string;
  title: string;
  status: 'DRAFT' | 'FINALIZED';
};

/** Aksi detail yang tetap aman terhadap kegagalan API. */
export default function SplitBillDetailActions({ uuid, title, status }: SplitBillDetailActionsOwnProps) {
  const router = useRouter();
  const toast = useToast();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const duplicate = useApiMutation((mode: 'FULL' | 'PARTICIPANTS_ONLY') => splitBillApi.duplicate(uuid, { mode }), { invalidateKeys: [['split-bills']] });
  const removal = useApiMutation(() => splitBillApi.remove(uuid), { invalidateKeys: [['split-bills']] });

  useEffect(() => {
    const message = duplicate.error ?? removal.error;
    if (message) toast.error('Aksi tagihan gagal', { description: message });
  }, [duplicate.error, removal.error, toast]);

  async function handleDuplicate(mode: 'FULL' | 'PARTICIPANTS_ONLY') {
    const copy = await duplicate.run(mode);
    if (!copy) return;
    toast.success(mode === 'FULL' ? 'Tagihan berhasil disalin' : 'Daftar peserta berhasil disalin', { description: 'Salinan baru disimpan sebagai Draft.' });
    router.push(`/bills/split/${copy.uuid}`);
    router.refresh();
  }

  async function handleRemove() {
    const result = await removal.run();
    if (!result) return;
    toast.success('Tagihan dihapus', { description: `${title} beserta seluruh rinciannya telah dihapus.` });
    router.push('/bills/split');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/bills/split"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
        >
          <DynamicIcon icon="ph:arrow-left" fontSize="16px" /> Kembali
        </Link>
        {status === 'DRAFT' && (
          <Link
            href={`/bills/split/${uuid}/edit`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-theme-primary px-3 py-2 text-sm font-bold text-gray-800 shadow-sm hover:bg-theme-secondary"
          >
            <DynamicIcon icon="ph:pencil-simple" fontSize="16px" /> Ubah
          </Link>
        )}
        <button
          type="button"
          disabled={duplicate.pending}
          onClick={() => void handleDuplicate('FULL')}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <DynamicIcon icon="ph:copy" fontSize="16px" /> Salin lengkap
        </button>
        <button
          type="button"
          disabled={duplicate.pending}
          onClick={() => void handleDuplicate('PARTICIPANTS_ONLY')}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <DynamicIcon icon="ph:users" fontSize="16px" /> Pakai peserta saja
        </button>
        <button
          type="button"
          onClick={() => setConfirmingRemoval(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
        >
          <DynamicIcon icon="ph:trash" fontSize="16px" /> Hapus
        </button>
      </div>

      <ConfirmModal
        open={confirmingRemoval}
        icon="ph:trash"
        title={`Hapus ${title}?`}
        description="Seluruh item dan hasil pembagiannya akan dihapus permanen."
        confirmLabel="Ya, hapus"
        pending={removal.pending}
        onConfirm={() => void handleRemove()}
        onCancel={() => setConfirmingRemoval(false)}
      />
    </div>
  );
}
