'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Money } from '@/src/components/ui/Money';
import { DataTable, type AppColumnDef } from '@/src/components/ui/DataTable';
import { Button } from '@/src/components/ui/Button';
import { Input, MoneyInput, Select } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { Sheet } from '@/src/components/ui/Sheet';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { debtApi } from '@/src/lib/debts/DebtApi';
import { syncSavedDebtToCache } from '@/src/lib/debts/DebtQueryCache';
import { formatDateID, toDateInputValue } from '@/src/helpers/DateHelper';
import { toAccountSelectOptions } from '@/src/lib/accounts/AccountSelectOptions';
import type { AccountDTO } from '@/src/lib/accounts/AccountService';
import type { DebtDTO, DebtPaymentDTO } from '@/src/lib/debts/DebtService';
import type { DebtPaymentUpdateInput } from '@/src/lib/debts/DebtValidator';
import type { DebtType } from '@prisma/client';
import type { Page } from '@/src/helpers/PaginationHelper';

type DebtsTableOwnProps = {
  type: DebtType;
  initialPage: Page<DebtDTO>;
  accounts: AccountDTO[];
};

type PaymentSheetOwnProps = {
  debt: DebtDTO;
  accounts: AccountDTO[];
  payment?: DebtPaymentDTO;
  onClose: () => void;
  onSaved: () => void;
};

function getPaidProgress(debt: DebtDTO) {
  return debt.amount > 0 ? Math.min(debt.paidAmount / debt.amount, 1) : 0;
}

function PaymentSheet({ debt, accounts, payment, onClose, onSaved }: PaymentSheetOwnProps) {
  const isOpeningBalance = payment?.isOpeningBalance ?? false;
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [paidAt, setPaidAt] = useState(payment?.paidAt ?? toDateInputValue(new Date()));
  const [accountUuid, setAccountUuid] = useState(payment?.account?.uuid ?? accounts[0]?.uuid ?? '');
  const [note, setNote] = useState(payment?.note ?? '');

  const save = useCallback(
    (input: DebtPaymentUpdateInput) =>
      payment ? debtApi.updatePayment(debt.uuid, payment.uuid, input) : debtApi.addPayment(debt.uuid, { ...input, accountUuid: input.accountUuid ?? '' }),
    [debt.uuid, payment],
  );
  const mutation = useApiMutation(save, { invalidateKeys: [['debts']], updateCache: syncSavedDebtToCache });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const saved = await mutation.run({
      amount: Number(amount),
      paidAt,
      note: note || null,
      ...(isOpeningBalance ? {} : { accountUuid }),
    });
    if (!saved) return;
    onClose();
    onSaved();
  }

  return (
    <Sheet open title={`${payment ? 'Ubah' : 'Catat'} Pembayaran - ${debt.party}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-xl bg-theme-light px-4 py-3 text-xs font-semibold text-gray-600">
          Sisa tagihan <Money value={debt.remaining} />
        </p>
        <ErrorAlert message={mutation.error} />
        <MoneyInput label="Jumlah Bayar" required placeholder="0" value={amount} onValueChange={setAmount} errors={mutation.fieldErrors.amount} />
        <Input label="Tanggal Bayar" type="date" required value={paidAt} onChange={event => setPaidAt(event.target.value)} errors={mutation.fieldErrors.paidAt} />

        {isOpeningBalance ? (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            Saldo awal hanya memperbarui progres hutang/piutang dan tidak mengubah transaksi atau saldo akun.
          </p>
        ) : (
          <Select
            label={debt.type === 'PAYABLE' ? 'Bayar dari Akun' : 'Terima ke Akun'}
            value={accountUuid}
            onChange={setAccountUuid}
            options={toAccountSelectOptions(accounts)}
            placeholder="Pilih akun"
            searchPlaceholder="Cari akun..."
            errors={mutation.fieldErrors.accountUuid}
          />
        )}

        <Input label="Catatan" placeholder="Opsional" maxLength={255} value={note} onChange={event => setNote(event.target.value)} errors={mutation.fieldErrors.note} />
        <Button type="submit" fullWidth disabled={mutation.pending}>
          {mutation.pending ? 'Menyimpan...' : payment ? 'Simpan Perubahan' : 'Simpan Pembayaran'}
        </Button>
      </form>
    </Sheet>
  );
}

function PaymentHistory({ debt, accounts, onDone }: { debt: DebtDTO; accounts: AccountDTO[]; onDone: () => void }) {
  const [editing, setEditing] = useState<DebtPaymentDTO | null>(null);
  const [deleting, setDeleting] = useState<DebtPaymentDTO | null>(null);
  const removal = useApiMutation((paymentUuid: string) => debtApi.removePayment(debt.uuid, paymentUuid), {
    invalidateKeys: [['debts']],
    updateCache: syncSavedDebtToCache,
  });

  async function handleDelete() {
    if (!deleting) return;
    const updated = await removal.run(deleting.uuid);
    setDeleting(null);
    if (updated) onDone();
  }

  return (
    <div className="mx-2 mb-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 sm:mx-4 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Riwayat pembayaran</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{debt.payments.length} pembayaran tercatat</p>
        </div>
        <span className="text-xs font-semibold text-gray-500">
          Total <Money value={debt.paidAmount} />
        </span>
      </div>

      {debt.payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center text-xs text-gray-400">Belum ada riwayat pembayaran.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {debt.payments.map(_payment => (
            <li key={`debt_payment__${_payment.uuid}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm shadow-gray-100/50">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${_payment.isOpeningBalance ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}
              >
                <DynamicIcon icon={_payment.isOpeningBalance ? 'ph:flag-banner-fold' : _payment.account?.type === 'BANK' ? 'ph:bank' : 'ph:wallet'} fontSize="15px" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold text-gray-800">
                    <Money value={_payment.amount} />
                  </span>
                  <span className="text-[11px] text-gray-400">{formatDateID(_payment.paidAt)}</span>
                </div>
                <p className="truncate text-[11px] text-gray-400">
                  {_payment.isOpeningBalance ? 'Saldo awal · tanpa mutasi akun' : (_payment.account?.name ?? 'Tanpa akun')}
                  {_payment.note && _payment.note !== 'Saldo awal pembayaran' ? ` · ${_payment.note}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(_payment)}
                aria-label="Ubah pembayaran"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
              >
                <DynamicIcon icon="ph:pencil-simple" fontSize="15px" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(_payment)}
                aria-label="Hapus pembayaran"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
              >
                <DynamicIcon icon="ph:trash" fontSize="15px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && <PaymentSheet debt={debt} accounts={accounts} payment={editing} onClose={() => setEditing(null)} onSaved={onDone} />}
      <ConfirmModal
        open={Boolean(deleting)}
        icon="ph:trash"
        title="Hapus pembayaran?"
        description="Transaksi terkait dan pengaruhnya pada saldo akun akan ikut dibatalkan."
        confirmLabel="Ya, hapus"
        pending={removal.pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function RowActions({ debt, accounts, onDone }: { debt: DebtDTO; accounts: AccountDTO[]; onDone: () => void }) {
  const [addingPayment, setAddingPayment] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const removal = useApiMutation(debtApi.remove, { invalidateKeys: [['debts']] });

  async function handleRemove() {
    const deleted = await removal.run(debt.uuid);
    setConfirmingRemoval(false);
    if (deleted) onDone();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {debt.status === 'OPEN' && (
        <button
          type="button"
          onClick={() => setAddingPayment(true)}
          aria-label={`Catat pembayaran untuk ${debt.party}`}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
        >
          <DynamicIcon icon="ph:cash-register" fontSize="16px" />
        </button>
      )}
      <button
        type="button"
        disabled={removal.pending}
        aria-label={`Hapus catatan ${debt.party}`}
        onClick={() => setConfirmingRemoval(true)}
        className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <DynamicIcon icon="ph:trash" fontSize="16px" />
      </button>

      {addingPayment && <PaymentSheet debt={debt} accounts={accounts} onClose={() => setAddingPayment(false)} onSaved={onDone} />}
      <ConfirmModal
        open={confirmingRemoval}
        icon="ph:trash"
        title={`Hapus catatan ${debt.party}?`}
        description="Seluruh transaksi dan riwayat pembayaran ikut dihapus, lalu pengaruhnya pada saldo akun dibatalkan."
        confirmLabel="Ya, hapus"
        pending={removal.pending}
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemoval(false)}
      />
    </div>
  );
}

export default function DebtsTable({ type, initialPage, accounts }: DebtsTableOwnProps) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  const columns = useMemo<AppColumnDef<DebtDTO>[]>(
    () => [
      {
        id: 'party',
        header: 'Pihak',
        meta: { className: 'w-full max-w-0' },
        cell: ({ row }) => {
          const debt = row.original;
          const isReceivable = debt.type === 'RECEIVABLE';
          return (
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isReceivable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                <DynamicIcon icon={isReceivable ? 'ph:hand-coins' : 'ph:hand-withdraw'} fontSize="16px" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-800">{debt.party}</p>
                <p className="truncate text-[11px] text-gray-400">
                  {debt.account ? `${debt.type === 'PAYABLE' ? 'Masuk ke' : 'Keluar dari'} ${debt.account.name}` : (debt.note ?? 'Tanpa akun awal')}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 md:hidden">
                  <div className={`h-full rounded-full ${isReceivable ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${getPaidProgress(debt) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'dueDate',
        header: 'Jatuh Tempo',
        cell: ({ row }) => <span className="whitespace-nowrap text-xs text-gray-500">{row.original.dueDate ? formatDateID(row.original.dueDate) : '-'}</span>,
        meta: { className: 'hidden lg:table-cell', headerClassName: 'hidden lg:table-cell' },
      },
      {
        id: 'progress',
        header: 'Terbayar',
        cell: ({ row }) => (
          <div className="w-32">
            <p className="text-xs text-gray-500">
              <Money value={row.original.paidAmount} /> / <Money value={row.original.amount} />
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${row.original.type === 'RECEIVABLE' ? 'bg-emerald-400' : 'bg-red-400'}`}
                style={{ width: `${getPaidProgress(row.original) * 100}%` }}
              />
            </div>
          </div>
        ),
        meta: { className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell' },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${row.original.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
          >
            {row.original.status === 'PAID' ? 'Lunas' : 'Berjalan'}
          </span>
        ),
        meta: { className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell' },
      },
      {
        id: 'remaining',
        header: 'Sisa',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-bold">
            <Money value={row.original.remaining} tone={row.original.type === 'RECEIVABLE' ? 'income' : 'expense'} />
          </span>
        ),
        meta: { className: 'text-right', headerClassName: 'text-right' },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <RowActions debt={row.original} accounts={accounts} onDone={refresh} />,
        meta: { className: 'w-20 text-right', headerClassName: 'w-20' },
      },
    ],
    [accounts, refresh],
  );

  return (
    <DataTable
      queryKey={['debts', type]}
      initialPage={initialPage}
      fetchPage={({ cursor, q }) => debtApi.list({ type, cursor, q })}
      columns={columns}
      getRowId={_row => _row.uuid}
      renderExpandedRow={_debt => <PaymentHistory debt={_debt} accounts={accounts} onDone={refresh} />}
      searchPlaceholder="Cari nama pihak atau catatan..."
      emptyIcon="ph:handshake"
      emptyTitle="Belum ada catatan"
      emptyDescription="Gunakan tombol Tambah Hutang / Piutang untuk mencatat yang baru."
    />
  );
}
