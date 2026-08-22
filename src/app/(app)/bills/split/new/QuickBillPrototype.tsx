'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Button } from '@/src/components/ui/Button';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { CONTROL_CLASS, MoneyInput } from '@/src/components/ui/Field';
import { Money } from '@/src/components/ui/Money';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Sheet } from '@/src/components/ui/Sheet';

type Participant = {
  id: string;
  name: string;
  color: string;
};

type PriceMode = 'UNIT_PRICE' | 'LINE_TOTAL';

type BillItem = {
  id: string;
  name: string;
  quantity: number;
  priceMode: PriceMode;
  price: string;
  discount: string;
  allocations: Record<string, number>;
};

type AdjustmentKind = 'DISCOUNT' | 'TAX' | 'SERVICE' | 'OTHER';
type AdjustmentCalculation = 'FIXED' | 'PERCENT';
type AdjustmentEffect = 'ADD' | 'SUBTRACT' | 'INCLUDED';
type AdjustmentDistribution = 'PROPORTIONAL' | 'EQUAL';

type Adjustment = {
  id: string;
  kind: AdjustmentKind;
  label: string;
  calculation: AdjustmentCalculation;
  value: string;
  effect: AdjustmentEffect;
  distribution: AdjustmentDistribution;
  customBase: string;
};

type CalculatedAdjustment = Adjustment & {
  amount: number;
  signedAmount: number;
  resolvedBase: number;
};

type PrototypeFixture = {
  label: string;
  description: string;
  merchant: string;
  participants: Participant[];
  items: BillItem[];
  adjustments: Adjustment[];
  receiptTotal: string;
};

const PARTICIPANT_COLORS = ['#FFE4D2', '#D4EDFF', '#E8E0FF', '#DCFCE7', '#FEF3C7', '#FCE7F3'];

const FIXTURES: Record<string, PrototypeFixture> = {
  simple: {
    label: 'Tanpa pajak',
    description: '5 item · 3 peserta · total Rp131.000',
    merchant: 'Warung Nusantara',
    participants: [
      { id: 'simple-ayu', name: 'Ayu', color: PARTICIPANT_COLORS[0] },
      { id: 'simple-budi', name: 'Budi', color: PARTICIPANT_COLORS[1] },
      { id: 'simple-citra', name: 'Citra', color: PARTICIPANT_COLORS[2] },
    ],
    items: [
      { id: 'simple-ayam', name: 'Ayam Bakar', quantity: 2, priceMode: 'UNIT_PRICE', price: '28000', discount: '', allocations: { 'simple-ayu': 1, 'simple-budi': 1 } },
      {
        id: 'simple-nasi',
        name: 'Nasi Putih',
        quantity: 3,
        priceMode: 'UNIT_PRICE',
        price: '7000',
        discount: '',
        allocations: { 'simple-ayu': 1, 'simple-budi': 1, 'simple-citra': 1 },
      },
      {
        id: 'simple-teh',
        name: 'Es Teh',
        quantity: 3,
        priceMode: 'UNIT_PRICE',
        price: '8000',
        discount: '',
        allocations: { 'simple-ayu': 1, 'simple-budi': 1, 'simple-citra': 1 },
      },
      { id: 'simple-tahu', name: 'Tahu Crispy', quantity: 1, priceMode: 'UNIT_PRICE', price: '18000', discount: '', allocations: { 'simple-citra': 1 } },
      { id: 'simple-air', name: 'Air Mineral', quantity: 2, priceMode: 'UNIT_PRICE', price: '6000', discount: '', allocations: { 'simple-ayu': 1, 'simple-budi': 1 } },
    ],
    adjustments: [],
    receiptTotal: '131000',
  },
  tax: {
    label: 'DPP + PPN',
    description: 'Basis khusus · PPN 11% · total Rp111.000',
    merchant: 'Kedai Contoh Pajak',
    participants: [
      { id: 'tax-dimas', name: 'Dimas', color: PARTICIPANT_COLORS[0] },
      { id: 'tax-sari', name: 'Sari', color: PARTICIPANT_COLORS[1] },
    ],
    items: [{ id: 'tax-paket', name: 'Paket Makan', quantity: 2, priceMode: 'UNIT_PRICE', price: '50000', discount: '', allocations: { 'tax-dimas': 1, 'tax-sari': 1 } }],
    adjustments: [
      {
        id: 'tax-ppn',
        kind: 'TAX',
        label: 'PPN',
        calculation: 'PERCENT',
        value: '11',
        effect: 'ADD',
        distribution: 'PROPORTIONAL',
        customBase: '100000',
      },
    ],
    receiptTotal: '111000',
  },
  discount: {
    label: 'Diskon + service',
    description: 'Diskon 10% · service 5% · total Rp141.750',
    merchant: 'Meja Bersama',
    participants: [
      { id: 'discount-raka', name: 'Raka', color: PARTICIPANT_COLORS[0] },
      { id: 'discount-nia', name: 'Nia', color: PARTICIPANT_COLORS[1] },
      { id: 'discount-tono', name: 'Tono', color: PARTICIPANT_COLORS[2] },
    ],
    items: [
      {
        id: 'discount-sharing',
        name: 'Menu Sharing',
        quantity: 3,
        priceMode: 'UNIT_PRICE',
        price: '50000',
        discount: '',
        allocations: { 'discount-raka': 1, 'discount-nia': 1, 'discount-tono': 1 },
      },
    ],
    adjustments: [
      {
        id: 'discount-main',
        kind: 'DISCOUNT',
        label: 'Diskon',
        calculation: 'PERCENT',
        value: '10',
        effect: 'SUBTRACT',
        distribution: 'PROPORTIONAL',
        customBase: '',
      },
      {
        id: 'discount-service',
        kind: 'SERVICE',
        label: 'Service',
        calculation: 'PERCENT',
        value: '5',
        effect: 'ADD',
        distribution: 'PROPORTIONAL',
        customBase: '',
      },
    ],
    receiptTotal: '141750',
  },
};

function createId(prefix: string) {
  return `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;
}

function createEmptyItem(): BillItem {
  return {
    id: createId('item'),
    name: '',
    quantity: 1,
    priceMode: 'UNIT_PRICE',
    price: '',
    discount: '',
    allocations: {},
  };
}

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getAllocatedQuantity(item: BillItem) {
  return Object.values(item.allocations).reduce((_total, _quantity) => _total + _quantity, 0);
}

function getItemGross(item: BillItem) {
  const price = toNumber(item.price);
  return item.priceMode === 'LINE_TOTAL' ? price : price * item.quantity;
}

function getItemNet(item: BillItem) {
  return Math.max(getItemGross(item) - toNumber(item.discount), 0);
}

function adjustmentDefaults(kind: AdjustmentKind): Adjustment {
  const common = {
    id: createId('adjustment'),
    calculation: 'PERCENT' as const,
    value: kind === 'TAX' ? '11' : kind === 'SERVICE' ? '5' : kind === 'DISCOUNT' ? '10' : '',
    distribution: 'PROPORTIONAL' as const,
    customBase: '',
  };

  if (kind === 'DISCOUNT') return { ...common, kind, label: 'Diskon', effect: 'SUBTRACT' };
  if (kind === 'TAX') return { ...common, kind, label: 'PPN/PB1', effect: 'ADD' };
  if (kind === 'SERVICE') return { ...common, kind, label: 'Service', effect: 'ADD' };

  return { ...common, kind, label: 'Pembulatan', calculation: 'FIXED', effect: 'ADD' };
}

/**
 * Prototype interaktif Quick Bill Canvas. Kalkulasi di sini sengaja cukup
 * akurat untuk usability testing, tetapi belum menggantikan calculation engine
 * desimal dan service persistence yang akan dibuat pada fase berikutnya.
 * @returns {ReactNode} Canvas input bill beserta fixture dan ringkasan langsung.
 */
export default function QuickBillPrototype() {
  const itemNameRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [payerId, setPayerId] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<BillItem[]>(() => [createEmptyItem()]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [receiptTotal, setReceiptTotal] = useState('');
  const [focusedParticipantId, setFocusedParticipantId] = useState('');
  const [notice, setNotice] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [removedItem, setRemovedItem] = useState<{ item: BillItem; index: number } | null>(null);

  const activeItems = useMemo(() => items.filter(_item => _item.name.trim() || toNumber(_item.price) > 0), [items]);
  const subtotal = useMemo(() => activeItems.reduce((_total, _item) => _total + getItemNet(_item), 0), [activeItems]);

  const calculatedAdjustments = useMemo(() => {
    return adjustments.reduce<{ rows: CalculatedAdjustment[]; runningTotal: number }>(
      (_state, _adjustment) => {
        const resolvedBase = _adjustment.customBase ? toNumber(_adjustment.customBase) : _state.runningTotal;
        const amount = _adjustment.calculation === 'FIXED' ? toNumber(_adjustment.value) : (resolvedBase * toNumber(_adjustment.value)) / 100;
        const signedAmount = _adjustment.effect === 'INCLUDED' ? 0 : _adjustment.effect === 'SUBTRACT' ? -amount : amount;

        return {
          rows: [..._state.rows, { ..._adjustment, amount, signedAmount, resolvedBase }],
          runningTotal: _state.runningTotal + signedAmount,
        };
      },
      { rows: [], runningTotal: subtotal },
    ).rows;
  }, [adjustments, subtotal]);

  const grandTotal = subtotal + calculatedAdjustments.reduce((_total, _adjustment) => _total + _adjustment.signedAmount, 0);
  const incompleteItems = activeItems.filter(_item => getAllocatedQuantity(_item) !== _item.quantity);
  const receiptDifference = receiptTotal ? toNumber(receiptTotal) - grandTotal : null;

  const participantTotals = useMemo(() => {
    const base = Object.fromEntries(participants.map(_participant => [_participant.id, 0])) as Record<string, number>;

    for (const _item of activeItems) {
      const net = getItemNet(_item);
      for (const [_participantId, _quantity] of Object.entries(_item.allocations)) {
        if (_participantId in base) base[_participantId] += (net * _quantity) / _item.quantity;
      }
    }

    const totals = { ...base };
    const activeParticipants = participants.filter(_participant => base[_participant.id] > 0);
    const baseTotal = activeParticipants.reduce((_total, _participant) => _total + base[_participant.id], 0);

    for (const _adjustment of calculatedAdjustments) {
      if (_adjustment.signedAmount === 0 || activeParticipants.length === 0) continue;

      for (const _participant of activeParticipants) {
        const ratio = _adjustment.distribution === 'EQUAL' ? 1 / activeParticipants.length : baseTotal > 0 ? base[_participant.id] / baseTotal : 0;
        totals[_participant.id] += _adjustment.signedAmount * ratio;
      }
    }

    return totals;
  }, [activeItems, calculatedAdjustments, participants]);

  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (participants.length === 0) messages.push('Tambahkan minimal satu peserta.');
    if (activeItems.length === 0) messages.push('Tambahkan minimal satu item.');
    if (activeItems.some(_item => !_item.name.trim() || toNumber(_item.price) <= 0)) messages.push('Lengkapi nama dan harga seluruh item.');
    if (incompleteItems.length > 0) messages.push(`${incompleteItems.length} item belum dibagi sampai habis.`);
    if (grandTotal <= 0) messages.push('Grand total harus lebih dari nol.');
    if (receiptDifference !== null && Math.abs(receiptDifference) >= 0.5) messages.push('Total hasil hitung belum sama dengan total pada struk.');
    return messages;
  }, [activeItems, grandTotal, incompleteItems.length, participants.length, receiptDifference]);

  const readyToFinalize = validationMessages.length === 0;
  const focusedParticipant = participants.find(_participant => _participant.id === focusedParticipantId);

  function loadFixture(key: string) {
    const fixture = FIXTURES[key];
    setMerchant(fixture.merchant);
    setParticipants(fixture.participants.map(_participant => ({ ..._participant })));
    setItems(fixture.items.map(_item => ({ ..._item, allocations: { ..._item.allocations } })));
    setAdjustments(fixture.adjustments.map(_adjustment => ({ ..._adjustment })));
    setReceiptTotal(fixture.receiptTotal);
    setPayerId(fixture.participants[0]?.id ?? '');
    setFocusedParticipantId('');
    setRemovedItem(null);
    setNotice(`Skenario “${fixture.label}” dimuat.`);
  }

  function addParticipants() {
    const names = participantInput
      .split(/[,\n]/)
      .map(_name => _name.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    setParticipants(_current => {
      const next = [..._current];

      for (const _name of names) {
        if (next.some(_participant => _participant.name.localeCompare(_name, 'id', { sensitivity: 'accent' }) === 0)) continue;
        next.push({ id: createId('participant'), name: _name, color: PARTICIPANT_COLORS[next.length % PARTICIPANT_COLORS.length] });
      }

      return next;
    });
    setParticipantInput('');
  }

  function removeParticipant(participantId: string) {
    const hasAllocations = items.some(_item => (_item.allocations[participantId] ?? 0) > 0);
    if (hasAllocations) {
      setNotice('Peserta masih memiliki item. Pindahkan atau lepaskan unitnya terlebih dahulu.');
      return;
    }

    setParticipants(_current => _current.filter(_participant => _participant.id !== participantId));
    if (payerId === participantId) setPayerId('');
    if (focusedParticipantId === participantId) setFocusedParticipantId('');
  }

  function updateItem(itemId: string, patch: Partial<BillItem>) {
    setItems(_current => _current.map(_item => (_item.id === itemId ? { ..._item, ...patch } : _item)));
  }

  function updateItemQuantity(item: BillItem, nextQuantity: number) {
    const quantity = Math.max(1, Math.min(99, Math.floor(nextQuantity || 1)));
    if (getAllocatedQuantity(item) > quantity) {
      setNotice('Kurangi assignment terlebih dahulu sebelum menurunkan kuantitas item.');
      return;
    }
    updateItem(item.id, { quantity });
  }

  function addItem() {
    const nextItem = createEmptyItem();
    setItems(_current => [..._current, nextItem]);
    requestAnimationFrame(() => itemNameRefs.current[nextItem.id]?.focus());
  }

  function removeItem(item: BillItem) {
    const index = items.findIndex(_item => _item.id === item.id);
    setRemovedItem({ item, index });
    setItems(_current => {
      const next = _current.filter(_item => _item.id !== item.id);
      return next.length > 0 ? next : [createEmptyItem()];
    });
  }

  function restoreRemovedItem() {
    if (!removedItem) return;
    setItems(_current => {
      const next = [..._current];
      const blankOnly = next.length === 1 && !next[0].name && !next[0].price;
      if (blankOnly) return [removedItem.item];
      next.splice(Math.min(removedItem.index, next.length), 0, removedItem.item);
      return next;
    });
    setRemovedItem(null);
  }

  function duplicateItem(item: BillItem) {
    const copy = { ...item, id: createId('item'), allocations: {} };
    const index = items.findIndex(_item => _item.id === item.id);
    setItems(_current => [..._current.slice(0, index + 1), copy, ..._current.slice(index + 1)]);
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    setItems(_current => {
      const index = _current.findIndex(_item => _item.id === itemId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= _current.length) return _current;
      const next = [..._current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function assignOne(item: BillItem, participantId: string) {
    const current = item.allocations[participantId] ?? 0;

    if (item.quantity === 1) {
      updateItem(item.id, { allocations: current === 1 ? {} : { [participantId]: 1 } });
      return;
    }

    if (getAllocatedQuantity(item) >= item.quantity) {
      setNotice('Semua unit item ini sudah dibagi. Kurangi assignment lain terlebih dahulu.');
      return;
    }

    updateItem(item.id, { allocations: { ...item.allocations, [participantId]: current + 1 } });
  }

  function removeOneAssignment(item: BillItem, participantId: string) {
    const current = item.allocations[participantId] ?? 0;
    if (current <= 0) return;
    const allocations = { ...item.allocations };
    if (current === 1) delete allocations[participantId];
    else allocations[participantId] = current - 1;
    updateItem(item.id, { allocations });
  }

  function assignRemaining(item: BillItem, participantId: string) {
    const remaining = item.quantity - getAllocatedQuantity(item);
    if (remaining <= 0) return;
    updateItem(item.id, { allocations: { ...item.allocations, [participantId]: (item.allocations[participantId] ?? 0) + remaining } });
  }

  function autoAssign(item: BillItem) {
    if (participants.length === 0) {
      setNotice('Tambahkan peserta sebelum membagi item.');
      return;
    }

    const allocations = { ...item.allocations };
    let remaining = item.quantity - getAllocatedQuantity(item);
    let cursor = 0;
    while (remaining > 0) {
      const participant = participants[cursor % participants.length];
      allocations[participant.id] = (allocations[participant.id] ?? 0) + 1;
      remaining -= 1;
      cursor += 1;
    }
    updateItem(item.id, { allocations });
  }

  function updateAdjustment(adjustmentId: string, patch: Partial<Adjustment>) {
    setAdjustments(_current => _current.map(_adjustment => (_adjustment.id === adjustmentId ? { ..._adjustment, ...patch } : _adjustment)));
  }

  function moveAdjustment(adjustmentId: string, direction: -1 | 1) {
    setAdjustments(_current => {
      const index = _current.findIndex(_adjustment => _adjustment.id === adjustmentId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= _current.length) return _current;
      const next = [..._current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handlePriceKeyDown(event: KeyboardEvent<HTMLInputElement>, item: BillItem) {
    if (event.key !== 'Enter' || !item.name.trim() || toNumber(item.price) <= 0) return;
    event.preventDefault();
    addItem();
  }

  function renderSummary(compact = false) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-theme-light p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-500">Grand total</span>
            <Money value={grandTotal} className="text-xl font-bold" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Progress pembagian</span>
            <span className={`font-bold ${incompleteItems.length === 0 && activeItems.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {activeItems.length - incompleteItems.length}/{activeItems.length} item
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3 text-gray-500">
            <span>Subtotal item</span>
            <Money value={subtotal} />
          </div>
          {calculatedAdjustments.map(_adjustment => (
            <div key={`summary_adjustment_${_adjustment.id}`} className="flex justify-between gap-3 text-gray-500">
              <span className="truncate">{_adjustment.label || 'Adjustment'}</span>
              <Money value={_adjustment.signedAmount} tone="auto" />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Total per orang</p>
          <div className="flex flex-col gap-2">
            {participants.length === 0 ? (
              <p className="text-xs text-gray-400">Tambahkan peserta untuk melihat pembagian.</p>
            ) : (
              participants.map(_participant => (
                <div key={`participant_total_${_participant.id}`} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: _participant.color }} />
                    <span className="truncate">{_participant.name}</span>
                  </span>
                  <Money value={participantTotals[_participant.id] ?? 0} className="text-sm font-bold" />
                </div>
              ))
            )}
          </div>
        </div>

        {receiptDifference !== null && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${Math.abs(receiptDifference) < 0.5 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
          >
            {Math.abs(receiptDifference) < 0.5 ? (
              <span className="flex items-center gap-2">
                <DynamicIcon icon="ph:check-circle" fontSize="17px" /> Total sudah cocok
              </span>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Selisih terhadap struk</span>
                <Money value={receiptDifference} tone="auto" className="font-bold" />
              </div>
            )}
          </div>
        )}

        {!compact && validationMessages.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-3 py-3">
            <p className="text-xs font-bold text-gray-600">Sebelum finalisasi</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-gray-500">
              {validationMessages.map(_message => (
                <li key={`validation_${_message}`}>{_message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => setNotice('Prototype Fase 0: draft belum ditulis ke database.')}>
            Simpan draft
          </Button>
          <Button type="button" disabled={!readyToFinalize} onClick={() => setNotice('Semua guard terpenuhi. Bill siap diteruskan ke persistence pada fase berikutnya.')}>
            Finalisasi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20 lg:pb-0">
      <PageHeader title="Bagi Tagihan" subtitle="Prototype Quick Bill Canvas · state belum disimpan" />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:max-w-md">
        <button type="button" className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-gray-800 shadow-sm">
          Bagi Tagihan
        </button>
        <button
          type="button"
          onClick={() => setNotice('Hutang & Piutang akan menjadi halaman terpisah di dalam menu Tagihan.')}
          className="rounded-lg px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
        >
          Hutang & Piutang
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700">
        <span className="font-bold">Mode prototype.</span> Gunakan fixture atau isi sendiri untuk menguji kecepatan dan kenyamanan. Tombol simpan tidak mengubah database.
      </div>

      <Card>
        <SectionTitle title="Skenario uji" />
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(FIXTURES).map(([_key, _fixture]) => (
            <button
              key={`fixture_${_key}`}
              type="button"
              onClick={() => loadFixture(_key)}
              className="rounded-xl border border-gray-100 px-3 py-3 text-left transition-colors hover:border-theme-light-border hover:bg-theme-light"
            >
              <span className="block text-sm font-bold text-gray-800">{_fixture.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">{_fixture.description}</span>
            </button>
          ))}
        </div>
      </Card>

      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-theme-light-border bg-theme-light px-4 py-3 text-sm text-gray-700">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Tutup pemberitahuan" className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700">
            <DynamicIcon icon="ph:x" fontSize="16px" />
          </button>
        </div>
      )}

      {removedItem && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-gray-800 px-4 py-3 text-sm text-white">
          <span>Item “{removedItem.item.name || 'Tanpa nama'}” dihapus.</span>
          <button type="button" onClick={restoreRemovedItem} className="shrink-0 font-bold text-theme-primary">
            Urungkan
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <SectionTitle title="Detail tagihan" action={<span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">Field minimum</span>} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700 sm:col-span-2">
                Nama tempat atau judul
                <input
                  value={merchant}
                  onChange={_event => setMerchant(_event.target.value)}
                  placeholder="Opsional, mis. Makan siang kantor"
                  className={`${CONTROL_CLASS} border-gray-200 focus:border-theme-accent`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
                Tanggal
                <input type="date" value={date} onChange={_event => setDate(_event.target.value)} className={`${CONTROL_CLASS} border-gray-200 focus:border-theme-accent`} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
                Pembayar utama
                <select value={payerId} onChange={_event => setPayerId(_event.target.value)} className={`${CONTROL_CLASS} border-gray-200 focus:border-theme-accent`}>
                  <option value="">Belum ditentukan</option>
                  {participants.map(_participant => (
                    <option key={`payer_${_participant.id}`} value={_participant.id}>
                      {_participant.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="Peserta"
              action={
                focusedParticipant && (
                  <button type="button" onClick={() => setFocusedParticipantId('')} className="text-xs font-bold text-gray-500 hover:text-gray-800">
                    Matikan fokus
                  </button>
                )
              }
            />
            <div className="flex flex-wrap gap-2">
              {participants.map(_participant => {
                const isFocused = focusedParticipantId === _participant.id;
                return (
                  <span
                    key={`participant_${_participant.id}`}
                    className={`inline-flex min-h-11 items-center overflow-hidden rounded-full border ${isFocused ? 'border-gray-700 ring-2 ring-gray-200' : 'border-gray-200'}`}
                    style={{ backgroundColor: _participant.color }}
                  >
                    <button
                      type="button"
                      onClick={() => setFocusedParticipantId(isFocused ? '' : _participant.id)}
                      className="flex h-11 items-center gap-2 pl-3 pr-2 text-sm font-bold text-gray-700"
                      aria-pressed={isFocused}
                    >
                      <span>{_participant.name}</span>
                      {isFocused && <span className="text-[9px] uppercase tracking-wide">Fokus</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParticipant(_participant.id)}
                      aria-label={`Hapus ${_participant.name}`}
                      className="flex h-11 w-9 items-center justify-center border-l border-black/5 text-gray-500 hover:bg-white/40"
                    >
                      <DynamicIcon icon="ph:x" fontSize="14px" />
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={participantInput}
                onChange={_event => setParticipantInput(_event.target.value)}
                onKeyDown={_event => {
                  if (_event.key === 'Enter') {
                    _event.preventDefault();
                    addParticipants();
                  }
                }}
                placeholder="Tambah nama; bisa Ayu, Budi, Citra"
                aria-label="Tambah peserta"
                className={`${CONTROL_CLASS} min-w-0 flex-1 border-gray-200 focus:border-theme-accent`}
              />
              <Button type="button" variant="secondary" onClick={addParticipants} disabled={!participantInput.trim()}>
                <DynamicIcon icon="ph:user-plus" fontSize="18px" /> Tambah
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">Klik peserta untuk mengaktifkan Fokus peserta. Tekan Enter atau pisahkan nama dengan koma untuk input cepat.</p>
          </Card>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Item dan pembagian</h2>
                <p className="text-[11px] text-gray-400">Isi lalu assign pada kartu yang sama.</p>
              </div>
              <Button type="button" variant="secondary" onClick={addItem} className="px-3 py-2.5">
                <DynamicIcon icon="ph:plus" fontSize="16px" /> Item
              </Button>
            </div>

            {items.map((_item, _itemIndex) => {
              const allocated = getAllocatedQuantity(_item);
              const remaining = _item.quantity - allocated;
              const complete = allocated === _item.quantity;

              return (
                <Card key={`bill_item_${_item.id}`} className={activeItems.includes(_item) && complete ? 'border-emerald-200' : ''}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-400">Item {_itemIndex + 1}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveItem(_item.id, -1)}
                        disabled={_itemIndex === 0}
                        aria-label="Naikkan item"
                        className="rounded-lg p-2 text-gray-300 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-30"
                      >
                        <DynamicIcon icon="ph:arrow-up" fontSize="15px" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(_item.id, 1)}
                        disabled={_itemIndex === items.length - 1}
                        aria-label="Turunkan item"
                        className="rounded-lg p-2 text-gray-300 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-30"
                      >
                        <DynamicIcon icon="ph:arrow-down" fontSize="15px" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateItem(_item)}
                        aria-label="Duplikat item"
                        className="rounded-lg p-2 text-gray-300 hover:bg-gray-50 hover:text-gray-600"
                      >
                        <DynamicIcon icon="ph:copy" fontSize="15px" />
                      </button>
                      <button type="button" onClick={() => removeItem(_item)} aria-label="Hapus item" className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500">
                        <DynamicIcon icon="ph:trash" fontSize="15px" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(10rem,0.8fr)]">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
                      Nama item
                      <input
                        ref={_element => {
                          itemNameRefs.current[_item.id] = _element;
                        }}
                        value={_item.name}
                        onChange={_event => updateItem(_item.id, { name: _event.target.value })}
                        placeholder="Mis. Nasi Goreng"
                        className={`${CONTROL_CLASS} border-gray-200 focus:border-theme-accent`}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
                      Qty
                      <input
                        type="number"
                        min="1"
                        max="99"
                        inputMode="numeric"
                        value={_item.quantity}
                        onChange={_event => updateItemQuantity(_item, Number(_event.target.value))}
                        className={`${CONTROL_CLASS} border-gray-200 focus:border-theme-accent`}
                      />
                    </label>
                    <MoneyInput
                      label={_item.priceMode === 'UNIT_PRICE' ? 'Harga per unit' : 'Total baris'}
                      value={_item.price}
                      onValueChange={_value => updateItem(_item.id, { price: _value })}
                      onKeyDown={_event => handlePriceKeyDown(_event, _item)}
                      maxFractionDigits={0}
                      placeholder="0"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => updateItem(_item.id, { priceMode: 'UNIT_PRICE' })}
                        className={`rounded-md px-2.5 py-1.5 ${_item.priceMode === 'UNIT_PRICE' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
                      >
                        Harga/unit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(_item.id, { priceMode: 'LINE_TOTAL' })}
                        className={`rounded-md px-2.5 py-1.5 ${_item.priceMode === 'LINE_TOTAL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
                      >
                        Total baris
                      </button>
                    </div>
                    <span className="text-sm font-bold">
                      <Money value={getItemNet(_item)} />
                    </span>
                  </div>

                  <details className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-bold text-gray-500">+ Diskon item</summary>
                    <div className="mt-3 max-w-xs">
                      <MoneyInput
                        label="Nominal diskon item"
                        value={_item.discount}
                        onValueChange={_value => updateItem(_item.id, { discount: _value })}
                        maxFractionDigits={0}
                        placeholder="0"
                      />
                    </div>
                  </details>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-600">Untuk siapa?</p>
                      <div className="flex items-center gap-2">
                        {remaining > 0 && participants.length > 0 && (
                          <button type="button" onClick={() => autoAssign(_item)} className="text-[11px] font-bold text-gray-500 hover:text-gray-800">
                            Bagi rata sisa
                          </button>
                        )}
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {complete ? `Terbagi ${allocated}/${_item.quantity}` : `Sisa ${remaining} dari ${_item.quantity}`}
                        </span>
                      </div>
                    </div>

                    {participants.length === 0 ? (
                      <p className="rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-400">Tambahkan peserta untuk mulai membagi item.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {participants.map(_participant => {
                          const assigned = _item.allocations[_participant.id] ?? 0;
                          if (_item.quantity === 1) {
                            return (
                              <button
                                key={`single_assignment_${_item.id}_${_participant.id}`}
                                type="button"
                                onClick={() => assignOne(_item, _participant.id)}
                                aria-pressed={assigned === 1}
                                className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors ${assigned ? 'border-gray-700 text-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                                style={assigned ? { backgroundColor: _participant.color } : undefined}
                              >
                                {_participant.name} {assigned ? <DynamicIcon icon="ph:check" fontSize="15px" /> : <DynamicIcon icon="ph:plus" fontSize="15px" />}
                              </button>
                            );
                          }

                          return (
                            <div
                              key={`multi_assignment_${_item.id}_${_participant.id}`}
                              className={`inline-flex min-h-11 items-center overflow-hidden rounded-full border ${assigned ? 'border-gray-700' : 'border-gray-200'}`}
                              style={assigned ? { backgroundColor: _participant.color } : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => removeOneAssignment(_item, _participant.id)}
                                disabled={!assigned}
                                aria-label={`Kurangi unit ${_participant.name}`}
                                className="flex h-11 w-9 items-center justify-center text-gray-500 disabled:opacity-25"
                              >
                                <DynamicIcon icon="ph:minus" fontSize="14px" />
                              </button>
                              <button
                                type="button"
                                onClick={() => remaining > 0 && assignRemaining(_item, _participant.id)}
                                className="min-w-16 px-1 text-sm font-bold text-gray-700"
                                title="Klik untuk memberikan seluruh sisa unit"
                              >
                                {_participant.name} {assigned || ''}
                              </button>
                              <button
                                type="button"
                                onClick={() => assignOne(_item, _participant.id)}
                                disabled={remaining <= 0}
                                aria-label={`Tambah unit ${_participant.name}`}
                                className="flex h-11 w-9 items-center justify-center text-gray-500 disabled:opacity-25"
                              >
                                <DynamicIcon icon="ph:plus" fontSize="14px" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {focusedParticipant && remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => assignOne(_item, focusedParticipant.id)}
                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-theme-light-border bg-theme-light px-3 text-xs font-bold text-gray-700"
                      >
                        <DynamicIcon icon="ph:plus" fontSize="16px" /> Tambah 1 unit ke {focusedParticipant.name}
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <SectionTitle title="Ringkasan struk" action={<span className="text-[10px] font-bold text-gray-400">Opsional</span>} />
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  ['DISCOUNT', 'ph:tag', 'Diskon'],
                  ['TAX', 'ph:percent', 'Pajak'],
                  ['SERVICE', 'ph:bell', 'Service'],
                  ['OTHER', 'ph:plus-minus', 'Pembulatan/Lainnya'],
                ] as const
              ).map(([_kind, _icon, _label]) => (
                <button
                  key={`add_adjustment_${_kind}`}
                  type="button"
                  onClick={() => setAdjustments(_current => [..._current, adjustmentDefaults(_kind)])}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 hover:border-theme-light-border hover:bg-theme-light"
                >
                  <DynamicIcon icon={_icon} fontSize="16px" /> + {_label}
                </button>
              ))}
            </div>

            {adjustments.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-400">Tidak ada biaya tambahan. Bill sederhana dapat langsung dilanjutkan.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {calculatedAdjustments.map((_adjustment, _index) => (
                  <div key={`adjustment_${_adjustment.id}`} className="rounded-xl border border-gray-100 p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
                      <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                        Label
                        <input
                          value={_adjustment.label}
                          onChange={_event => updateAdjustment(_adjustment.id, { label: _event.target.value })}
                          className={`${CONTROL_CLASS} border-gray-200 py-2.5 text-sm focus:border-theme-accent`}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                        Hitung sebagai
                        <select
                          value={_adjustment.calculation}
                          onChange={_event => updateAdjustment(_adjustment.id, { calculation: _event.target.value as AdjustmentCalculation })}
                          className={`${CONTROL_CLASS} border-gray-200 py-2.5 text-sm focus:border-theme-accent`}
                        >
                          <option value="PERCENT">Persen</option>
                          <option value="FIXED">Nominal</option>
                        </select>
                      </label>
                      {_adjustment.calculation === 'FIXED' ? (
                        <MoneyInput
                          label="Nilai"
                          value={_adjustment.value}
                          onValueChange={_value => updateAdjustment(_adjustment.id, { value: _value })}
                          maxFractionDigits={0}
                          className="py-2.5 text-sm"
                        />
                      ) : (
                        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                          Persentase
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={_adjustment.value}
                              onChange={_event => updateAdjustment(_adjustment.id, { value: _event.target.value })}
                              className={`${CONTROL_CLASS} border-gray-200 py-2.5 pr-8 text-sm focus:border-theme-accent`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                          </div>
                        </label>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                        Efek
                        <select
                          value={_adjustment.effect}
                          onChange={_event => updateAdjustment(_adjustment.id, { effect: _event.target.value as AdjustmentEffect })}
                          className={`${CONTROL_CLASS} border-gray-200 py-2.5 text-sm focus:border-theme-accent`}
                        >
                          <option value="ADD">Ditambahkan</option>
                          <option value="SUBTRACT">Dikurangi</option>
                          <option value="INCLUDED">Sudah termasuk</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                        Distribusi
                        <select
                          value={_adjustment.distribution}
                          onChange={_event => updateAdjustment(_adjustment.id, { distribution: _event.target.value as AdjustmentDistribution })}
                          className={`${CONTROL_CLASS} border-gray-200 py-2.5 text-sm focus:border-theme-accent`}
                        >
                          <option value="PROPORTIONAL">Proporsional</option>
                          <option value="EQUAL">Rata</option>
                        </select>
                      </label>
                      <MoneyInput
                        label="DPP/basis khusus"
                        value={_adjustment.customBase}
                        onValueChange={_value => updateAdjustment(_adjustment.id, { customBase: _value })}
                        maxFractionDigits={0}
                        placeholder="Otomatis"
                        className="py-2.5 text-sm"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] text-gray-500">
                        {_adjustment.calculation === 'PERCENT' ? `${_adjustment.value || 0}% × ` : ''}
                        <Money value={_adjustment.resolvedBase} /> = <Money value={_adjustment.amount} />
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveAdjustment(_adjustment.id, -1)}
                          disabled={_index === 0}
                          aria-label="Naikkan adjustment"
                          className="rounded-md p-1.5 text-gray-400 hover:bg-white disabled:opacity-25"
                        >
                          <DynamicIcon icon="ph:arrow-up" fontSize="14px" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAdjustment(_adjustment.id, 1)}
                          disabled={_index === adjustments.length - 1}
                          aria-label="Turunkan adjustment"
                          className="rounded-md p-1.5 text-gray-400 hover:bg-white disabled:opacity-25"
                        >
                          <DynamicIcon icon="ph:arrow-down" fontSize="14px" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustments(_current => _current.filter(_entry => _entry.id !== _adjustment.id))}
                          aria-label="Hapus adjustment"
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <DynamicIcon icon="ph:trash" fontSize="14px" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 max-w-sm">
              <MoneyInput
                label="Total pada struk"
                value={receiptTotal}
                onValueChange={setReceiptTotal}
                maxFractionDigits={0}
                placeholder="Opsional"
                hint="Dipakai untuk mendeteksi selisih, bukan mengubah hitungan otomatis."
              />
            </div>

            {receiptDifference !== null && Math.abs(receiptDifference) >= 0.5 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-amber-800">
                  <span>Selisih terdeteksi</span>
                  <Money value={receiptDifference} tone="auto" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const adjustment = adjustmentDefaults(receiptDifference > 0 ? 'OTHER' : 'DISCOUNT');
                      setAdjustments(_current => [
                        ..._current,
                        { ...adjustment, calculation: 'FIXED', value: String(Math.abs(receiptDifference)), label: receiptDifference > 0 ? 'Pembulatan' : 'Diskon selisih' },
                      ]);
                    }}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-amber-800 shadow-sm"
                  >
                    {receiptDifference > 0 ? 'Tambahkan sebagai pembulatan' : 'Tambahkan sebagai diskon'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotice('Periksa kembali harga, kuantitas, dan urutan adjustment pada item di atas.')}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-amber-700"
                  >
                    Periksa item
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="sticky top-6 hidden lg:block">
          <SectionTitle title="Ringkasan" />
          {renderSummary()}
        </Card>
      </div>

      <button
        type="button"
        onClick={() => setSummaryOpen(true)}
        className="fixed inset-x-3 bottom-[4.75rem] z-30 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-theme-light-border bg-white px-4 shadow-xl md:bottom-4 md:left-auto md:right-4 md:w-96 lg:hidden"
      >
        <span className="min-w-0 text-left">
          <span className="block truncate text-xs font-bold text-gray-700">{incompleteItems.length} item belum dibagi</span>
          <span className="block text-[10px] text-gray-400">Lihat total per orang</span>
        </span>
        <Money value={grandTotal} className="shrink-0 text-base font-bold" />
      </button>

      {summaryOpen && (
        <Sheet open title="Ringkasan Bagi Tagihan" onClose={() => setSummaryOpen(false)}>
          {renderSummary()}
        </Sheet>
      )}
    </div>
  );
}
