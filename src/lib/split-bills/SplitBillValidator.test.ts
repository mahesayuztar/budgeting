import assert from 'node:assert/strict';
import test from 'node:test';
import { splitBillSchema, type SplitBillInput } from './SplitBillValidator';

const UUIDS = {
  participantA: '00000000-0000-4000-8000-000000000001',
  participantB: '00000000-0000-4000-8000-000000000002',
  participantC: '00000000-0000-4000-8000-000000000003',
  participantD: '00000000-0000-4000-8000-000000000004',
  item: '00000000-0000-4000-8000-000000000101',
  adjustment: '00000000-0000-4000-8000-000000000201',
};

function validFinalInput(): SplitBillInput {
  return {
    title: 'Makan siang',
    merchantName: 'Warung Contoh',
    occurredAt: '2026-08-22',
    currency: 'IDR' as const,
    status: 'FINALIZED' as const,
    expectedReceiptTotal: '100000',
    participants: [
      { uuid: UUIDS.participantA, name: 'Ayu', isPayer: true, sortOrder: 0 },
      { uuid: UUIDS.participantB, name: 'Budi', isPayer: false, sortOrder: 1 },
    ],
    items: [
      {
        uuid: UUIDS.item,
        name: 'Paket Makan',
        quantity: 2,
        priceMode: 'UNIT_PRICE' as const,
        unitPrice: '50000',
        discountAmount: '0',
        sortOrder: 0,
        allocations: [
          { participantUuid: UUIDS.participantA, quantity: 1 },
          { participantUuid: UUIDS.participantB, quantity: 1 },
        ],
      },
    ],
    adjustments: [],
  };
}

function issueMessages(result: ReturnType<typeof splitBillSchema.safeParse>) {
  return result.success ? [] : result.error.issues.map(_issue => _issue.message);
}

test('draft kosong diterima sebagai recovery state', () => {
  const result = splitBillSchema.safeParse({ occurredAt: '2026-08-22', status: 'DRAFT' });
  assert.equal(result.success, true);
});

test('finalized lengkap dan reconcile diterima', () => {
  const result = splitBillSchema.safeParse(validFinalInput());
  assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues));
});

test('allocation tidak boleh melebihi quantity item', () => {
  const input = validFinalInput();
  input.items[0].allocations[0].quantity = 2;
  input.items[0].allocations[1].quantity = 1;

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).some(_message => _message.includes('maksimal 2')));
});

test('finalized menolak unit yang belum dibagi', () => {
  const input = validFinalInput();
  input.items[0].allocations = [{ participantUuid: UUIDS.participantA, quantity: 1 }];

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).some(_message => _message.includes('wajib dibagi')));
});

test('peserta assignment wajib berada dalam bill yang sama', () => {
  const input = validFinalInput();
  input.items[0].allocations[0].participantUuid = UUIDS.participantC;

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Peserta tidak ada dalam bill ini.'));
});

test('nama peserta, UUID, dan sortOrder duplikat ditolak', () => {
  const input = validFinalInput();
  input.participants[1] = { ...input.participants[0], name: 'AYU' };

  const result = splitBillSchema.safeParse(input);
  const messages = issueMessages(result);
  assert.equal(result.success, false);
  assert.ok(messages.includes('ID peserta duplikat.'));
  assert.ok(messages.includes('Nama peserta tidak boleh duplikat.'));
  assert.ok(messages.includes('Urutan peserta tidak boleh duplikat.'));
});

test('total pada struk harus reconcile sebelum finalisasi', () => {
  const input = validFinalInput();
  input.expectedReceiptTotal = '100001';

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Total hasil hitung belum sama dengan total pada struk.'));
});

test('mode harga melarang unitPrice dan lineTotal terisi bersamaan', () => {
  const input = validFinalInput();
  input.items[0].lineTotal = '100000';

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Total baris harus kosong pada mode harga per unit.'));
});

test('diskon item tidak boleh melebihi gross item', () => {
  const input = validFinalInput();
  input.items[0].discountAmount = '100001';

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Diskon item tidak boleh melebihi nilai kotor item.'));
});

test('adjustment persen dengan DPP custom tervalidasi dan reconcile', () => {
  const input = validFinalInput();
  input.expectedReceiptTotal = '111000';
  input.adjustments = [
    {
      uuid: UUIDS.adjustment,
      label: 'PPN',
      kind: 'TAX',
      calculation: 'PERCENT',
      baseMode: 'CUSTOM',
      effect: 'ADD',
      distribution: 'PROPORTIONAL',
      rate: '11',
      baseAmount: '100000',
      sortOrder: 0,
    },
  ];

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues));
});

test('adjustment custom tanpa DPP ditolak', () => {
  const input = validFinalInput();
  input.adjustments = [
    {
      uuid: UUIDS.adjustment,
      label: 'PPN',
      kind: 'TAX',
      calculation: 'PERCENT',
      baseMode: 'CUSTOM',
      effect: 'ADD',
      distribution: 'PROPORTIONAL',
      rate: '11',
      sortOrder: 0,
    },
  ];

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('DPP/basis khusus wajib diisi.'));
});

test('draft tetap menolak adjustment yang membuat grand total negatif', () => {
  const input = validFinalInput();
  input.status = 'DRAFT';
  input.adjustments = [
    {
      uuid: UUIDS.adjustment,
      label: 'Diskon',
      kind: 'DISCOUNT',
      calculation: 'FIXED',
      baseMode: 'ITEMS_NET',
      effect: 'SUBTRACT',
      distribution: 'PROPORTIONAL',
      amount: '200000',
      sortOrder: 0,
    },
  ];

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Adjustment tidak boleh membuat grand total negatif.'));
});

test('maksimal satu peserta dapat menjadi pembayar utama', () => {
  const input = validFinalInput();
  input.participants[1].isPayer = true;

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, false);
  assert.ok(issueMessages(result).includes('Pembayar utama maksimal satu orang.'));
});

test('item qty 4 dapat dibagi tepat kepada 4 peserta', () => {
  const input = validFinalInput();
  input.participants = [
    { uuid: UUIDS.participantA, name: 'Ayu', isPayer: true, sortOrder: 0 },
    { uuid: UUIDS.participantB, name: 'Budi', isPayer: false, sortOrder: 1 },
    { uuid: UUIDS.participantC, name: 'Citra', isPayer: false, sortOrder: 2 },
    { uuid: UUIDS.participantD, name: 'Dimas', isPayer: false, sortOrder: 3 },
  ];
  input.items[0].quantity = 4;
  input.items[0].unitPrice = '25000';
  input.items[0].allocations = input.participants.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 }));

  const result = splitBillSchema.safeParse(input);
  assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues));
});
