import { notFound } from 'next/navigation';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { Money } from '@/src/components/ui/Money';
import { formatDateID } from '@/src/helpers/DateHelper';
import { NotFoundError } from '@/src/lib/Errors';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { calculateSplitBill } from '@/src/lib/split-bills/SplitBillCalculator';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import SplitBillDetailActions from './SplitBillDetailActions';

type SplitBillDetailPageOwnProps = {
  params: Promise<{ uuid: string }>;
};

/** Detail read-only dengan breakdown item dan total akhir setiap peserta. */
export default async function SplitBillDetailPage({ params }: SplitBillDetailPageOwnProps) {
  const user = await requireAuthUser();
  const { uuid } = await params;
  let bill;
  try {
    bill = await splitBillService.get(user.id, uuid);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const calculation = calculateSplitBill({
    currency: bill.currency,
    participants: bill.participants.map(_participant => ({ uuid: _participant.uuid, sortOrder: _participant.sortOrder })),
    items: bill.items.map(_item => ({
      uuid: _item.uuid,
      quantity: _item.quantity,
      priceMode: _item.priceMode,
      unitPrice: _item.unitPrice,
      lineTotal: _item.lineTotal,
      discountAmount: _item.discountAmount,
      allocations: _item.allocations.map(_allocation => ({ participantUuid: _allocation.participantUuid, quantity: _allocation.quantity })),
    })),
    adjustments: bill.adjustments.map(_adjustment => ({
      uuid: _adjustment.uuid,
      calculation: _adjustment.calculation,
      baseMode: _adjustment.baseMode,
      effect: _adjustment.effect,
      distribution: _adjustment.distribution,
      rate: _adjustment.rate,
      baseAmount: _adjustment.baseAmount,
      amount: _adjustment.amount,
    })),
  });
  const participants = new Map(bill.participants.map(_participant => [_participant.uuid, _participant]));
  const participantTotals = new Map(calculation.participants.map(_participant => [_participant.uuid, Number(_participant.totalDue)]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">{bill.title}</h2>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${bill.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {bill.status === 'FINALIZED' ? 'Final' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {formatDateID(bill.occurredAt)}
            {bill.merchantName ? ` · ${bill.merchantName}` : ''}
          </p>
          {bill.status === 'FINALIZED' && <p className="mt-1 text-xs font-semibold text-emerald-600">Snapshot terkunci. Buat salinan jika perlu melakukan revisi.</p>}
        </div>
        <SplitBillDetailActions uuid={bill.uuid} title={bill.title} status={bill.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-theme-light-border bg-theme-light">
          <p className="text-xs font-semibold text-gray-500">Grand total</p>
          <p className="mt-1 text-xl font-bold">
            <Money value={bill.grandTotal} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Subtotal item</p>
          <p className="mt-1 text-lg font-bold">
            <Money value={bill.itemsSubtotal} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Adjustment</p>
          <p className="mt-1 text-lg font-bold">
            <Money value={bill.adjustmentTotal} tone="auto" />
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Card>
          <SectionTitle title={`Item · ${bill.items.length}`} />
          {bill.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">Draft ini belum memiliki item.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {bill.items.map(_item => (
                <li key={`split_bill_detail_item_${_item.uuid}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800">{_item.name}</p>
                      <p className="text-xs text-gray-400">
                        {_item.quantity} unit · {_item.allocations.reduce((_sum, _allocation) => _sum + _allocation.quantity, 0)} sudah dibagi
                      </p>
                    </div>
                    <Money value={_item.netAmount} className="shrink-0 font-bold" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {_item.allocations.length === 0 ? (
                      <span className="text-xs text-amber-600">Belum di-assign</span>
                    ) : (
                      _item.allocations.map(_allocation => (
                        <span key={`${_item.uuid}_${_allocation.participantUuid}`} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600">
                          {participants.get(_allocation.participantUuid)?.name ?? 'Peserta'} × {_allocation.quantity} · <Money value={_allocation.amount} />
                        </span>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionTitle title={`Per orang · ${bill.participants.length}`} />
            {bill.participants.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada peserta.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {bill.participants.map(_participant => (
                  <li key={`split_bill_detail_participant_${_participant.uuid}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{_participant.name}</p>
                      {_participant.isPayer && <p className="text-[10px] font-semibold text-theme-light-border">Pembayar utama</p>}
                    </div>
                    <Money value={participantTotals.get(_participant.uuid) ?? 0} className="font-bold" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {bill.adjustments.length > 0 && (
            <Card>
              <SectionTitle title="Adjustment" />
              <ul className="divide-y divide-gray-100">
                {bill.adjustments.map(_adjustment => (
                  <li key={`split_bill_detail_adjustment_${_adjustment.uuid}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{_adjustment.label}</p>
                      <p className="text-[10px] text-gray-400">
                        {_adjustment.calculation === 'PERCENT' ? `${_adjustment.rate}%` : 'Nominal'} · {_adjustment.distribution === 'EQUAL' ? 'rata' : 'proporsional'}
                      </p>
                    </div>
                    <Money
                      value={_adjustment.effect === 'SUBTRACT' ? -_adjustment.amount : _adjustment.effect === 'INCLUDED' ? 0 : _adjustment.amount}
                      tone="auto"
                      className="font-bold"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {(bill.receiptNumber || bill.note) && (
        <Card>
          <SectionTitle title="Catatan" />
          {bill.receiptNumber && (
            <p className="text-xs text-gray-500">
              Nomor struk: <span className="font-semibold text-gray-700">{bill.receiptNumber}</span>
            </p>
          )}
          {bill.note && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{bill.note}</p>}
        </Card>
      )}
    </div>
  );
}
