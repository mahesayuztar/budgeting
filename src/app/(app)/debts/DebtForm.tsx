'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/Button';
import { Input, MoneyInput } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { Sheet } from '@/src/components/ui/Sheet';
import { AddButton } from '@/src/components/ui/AddButton';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { debtApi } from '@/src/lib/debts/DebtApi';
import { toDateInputValue } from '@/src/helpers/DateHelper';

type DebtType = 'RECEIVABLE' | 'PAYABLE';

const DEBT_TYPE_OPTIONS: ReadonlyArray<{ value: DebtType; label: string }> = [
  { value: 'PAYABLE', label: 'Saya Berhutang' },
  { value: 'RECEIVABLE', label: 'Saya Piutang' },
];

/**
 * Form pencatatan hutang atau piutang baru dalam bentuk panel yang dipicu
 * tombol tambah. Setelah tersimpan, halaman disegarkan agar kartu ringkasan
 * yang dirender di server ikut memperbarui angkanya.
 * @returns {ReactNode} Tombol tambah beserta panel form hutang dan piutangnya.
 */
export default function DebtForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DebtType>('PAYABLE');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const { run, pending, error, fieldErrors, reset } = useApiMutation(debtApi.create, { invalidateKeys: [['debts']] });

  function handleClose() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await run({
      type,
      party,
      amount: Number(amount),
      date,
      dueDate: dueDate || null,
      note: note || null,
    });

    if (!created) return;

    setParty('');
    setAmount('');
    setDate(toDateInputValue(new Date()));
    setDueDate('');
    setNote('');
    handleClose();
    router.refresh();
  }

  return (
    <>
      <AddButton label="Tambah Hutang / Piutang" onClick={() => setOpen(true)} />

      <Sheet open={open} title="Tambah Hutang / Piutang" onClose={handleClose}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {DEBT_TYPE_OPTIONS.map(_option => (
              <button
                key={`debt_form__type_${_option.value}`}
                type="button"
                onClick={() => setType(_option.value)}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${type === _option.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                {_option.label}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label={type === 'PAYABLE' ? 'Berhutang kepada' : 'Dipinjam oleh'}
            required
            maxLength={80}
            placeholder="Nama orang / pihak"
            value={party}
            onChange={event => setParty(event.target.value)}
            errors={fieldErrors.party}
          />

          <MoneyInput label="Jumlah" required placeholder="0" value={amount} onValueChange={setAmount} errors={fieldErrors.amount} />

          <Input label="Tanggal" type="date" required value={date} onChange={event => setDate(event.target.value)} errors={fieldErrors.date} />

          <Input label="Tanggal Jatuh Tempo" type="date" hint="Opsional" value={dueDate} onChange={event => setDueDate(event.target.value)} errors={fieldErrors.dueDate} />

          <Input label="Catatan" placeholder="Opsional" maxLength={255} value={note} onChange={event => setNote(event.target.value)} errors={fieldErrors.note} />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
