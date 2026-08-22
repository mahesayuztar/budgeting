import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSplitBill, minorToMoney, moneyToMinor, type SplitBillCalculationInput } from './SplitBillCalculator';

const PARTICIPANTS = [
  { uuid: 'participant-a', sortOrder: 0 },
  { uuid: 'participant-b', sortOrder: 1 },
  { uuid: 'participant-c', sortOrder: 2 },
];

function baseInput(overrides: Partial<SplitBillCalculationInput> = {}): SplitBillCalculationInput {
  return {
    currency: 'IDR',
    participants: PARTICIPANTS,
    items: [],
    adjustments: [],
    ...overrides,
  };
}

test('mengonversi nominal ke minor unit dengan pembulatan half-up', () => {
  assert.equal(moneyToMinor('10.49', 0), BigInt(10));
  assert.equal(moneyToMinor('10.50', 0), BigInt(11));
  assert.equal(moneyToMinor('10.129', 2), BigInt(1013));
  assert.equal(minorToMoney(BigInt(1013), 2), '10.13');
  assert.equal(minorToMoney(BigInt(-500), 2), '-5.00');
});

test('menghitung fixture sederhana tanpa adjustment', () => {
  const result = calculateSplitBill(
    baseInput({
      items: [
        {
          uuid: 'ayam',
          quantity: 2,
          priceMode: 'UNIT_PRICE',
          unitPrice: '28000',
          allocations: [
            { participantUuid: 'participant-a', quantity: 1 },
            { participantUuid: 'participant-b', quantity: 1 },
          ],
        },
        {
          uuid: 'nasi',
          quantity: 3,
          priceMode: 'UNIT_PRICE',
          unitPrice: '7000',
          allocations: PARTICIPANTS.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 })),
        },
        {
          uuid: 'teh',
          quantity: 3,
          priceMode: 'UNIT_PRICE',
          unitPrice: '8000',
          allocations: PARTICIPANTS.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 })),
        },
        { uuid: 'tahu', quantity: 1, priceMode: 'UNIT_PRICE', unitPrice: '18000', allocations: [{ participantUuid: 'participant-c', quantity: 1 }] },
        {
          uuid: 'air',
          quantity: 2,
          priceMode: 'UNIT_PRICE',
          unitPrice: '6000',
          allocations: [
            { participantUuid: 'participant-a', quantity: 1 },
            { participantUuid: 'participant-b', quantity: 1 },
          ],
        },
      ],
    }),
  );

  assert.equal(result.itemsSubtotal, '131000');
  assert.equal(result.grandTotal, '131000');
  assert.equal(result.allocatedTotal, '131000');
  assert.equal(result.unallocatedTotal, '0');
  assert.equal(result.isFullyAllocated, true);
  assert.deepEqual(
    result.participants.map(_participant => _participant.totalDue),
    ['49000', '49000', '33000'],
  );
});

test('mode total baris mempertahankan nominal sumber dan diskon item hanya diterima pemiliknya', () => {
  const result = calculateSplitBill(
    baseInput({
      participants: PARTICIPANTS.slice(0, 2),
      items: [
        {
          uuid: 'sharing',
          quantity: 2,
          priceMode: 'LINE_TOTAL',
          lineTotal: '50001',
          discountAmount: '1',
          allocations: [
            { participantUuid: 'participant-a', quantity: 1 },
            { participantUuid: 'participant-b', quantity: 1 },
          ],
        },
      ],
    }),
  );

  assert.equal(result.items[0].grossAmount, '50001');
  assert.equal(result.items[0].netAmount, '50000');
  assert.deepEqual(
    result.participants.map(_participant => _participant.totalDue),
    ['25000', '25000'],
  );
});

test('PPN dengan DPP custom dan pajak included menghasilkan total yang benar', () => {
  const exclusive = calculateSplitBill(
    baseInput({
      participants: PARTICIPANTS.slice(0, 2),
      items: [
        {
          uuid: 'paket',
          quantity: 2,
          priceMode: 'UNIT_PRICE',
          unitPrice: '50000',
          allocations: [
            { participantUuid: 'participant-a', quantity: 1 },
            { participantUuid: 'participant-b', quantity: 1 },
          ],
        },
      ],
      adjustments: [
        {
          uuid: 'ppn',
          calculation: 'PERCENT',
          baseMode: 'CUSTOM',
          baseAmount: '100000',
          rate: '11',
          effect: 'ADD',
          distribution: 'PROPORTIONAL',
        },
      ],
    }),
  );

  assert.equal(exclusive.adjustments[0].amount, '11000');
  assert.equal(exclusive.grandTotal, '111000');
  assert.deepEqual(
    exclusive.participants.map(_participant => _participant.totalDue),
    ['55500', '55500'],
  );

  const included = calculateSplitBill({
    ...baseInput({
      participants: PARTICIPANTS.slice(0, 2),
      items: exclusive.items.map(_item => ({
        uuid: _item.uuid,
        quantity: 2,
        priceMode: 'LINE_TOTAL' as const,
        lineTotal: '100000',
        allocations: [
          { participantUuid: 'participant-a', quantity: 1 },
          { participantUuid: 'participant-b', quantity: 1 },
        ],
      })),
    }),
    adjustments: [
      {
        uuid: 'included',
        calculation: 'FIXED',
        baseMode: 'ITEMS_NET',
        amount: '11000',
        effect: 'INCLUDED',
        distribution: 'PROPORTIONAL',
      },
    ],
  });

  assert.equal(included.adjustments[0].amount, '11000');
  assert.equal(included.adjustments[0].signedAmount, '0');
  assert.equal(included.grandTotal, '100000');
});

test('urutan diskon lalu service memakai running total', () => {
  const result = calculateSplitBill(
    baseInput({
      items: [
        {
          uuid: 'sharing',
          quantity: 3,
          priceMode: 'UNIT_PRICE',
          unitPrice: '50000',
          allocations: PARTICIPANTS.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 })),
        },
      ],
      adjustments: [
        { uuid: 'discount', calculation: 'PERCENT', baseMode: 'RUNNING_TOTAL', rate: '10', effect: 'SUBTRACT', distribution: 'PROPORTIONAL' },
        { uuid: 'service', calculation: 'PERCENT', baseMode: 'RUNNING_TOTAL', rate: '5', effect: 'ADD', distribution: 'PROPORTIONAL' },
      ],
    }),
  );

  assert.equal(result.adjustments[0].amount, '15000');
  assert.equal(result.adjustments[1].baseAmount, '135000');
  assert.equal(result.adjustments[1].amount, '6750');
  assert.equal(result.grandTotal, '141750');
  assert.deepEqual(
    result.participants.map(_participant => _participant.totalDue),
    ['47250', '47250', '47250'],
  );
});

test('largest remainder memakai sortOrder sebagai tie-break dan selalu reconcile', () => {
  const result = calculateSplitBill(
    baseInput({
      items: [
        {
          uuid: 'odd',
          quantity: 3,
          priceMode: 'LINE_TOTAL',
          lineTotal: '100',
          allocations: PARTICIPANTS.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 })),
        },
      ],
    }),
  );

  assert.deepEqual(
    result.participants.map(_participant => _participant.totalDue),
    ['34', '33', '33'],
  );
  assert.equal(result.allocatedTotal, result.grandTotal);
});

test('largest remainder menangani adjustment positif dan negatif secara deterministik', () => {
  const result = calculateSplitBill(
    baseInput({
      items: [
        {
          uuid: 'odd',
          quantity: 3,
          priceMode: 'LINE_TOTAL',
          lineTotal: '100',
          allocations: PARTICIPANTS.map(_participant => ({ participantUuid: _participant.uuid, quantity: 1 })),
        },
      ],
      adjustments: [
        { uuid: 'discount', calculation: 'FIXED', baseMode: 'ITEMS_NET', amount: '1', effect: 'SUBTRACT', distribution: 'PROPORTIONAL' },
        { uuid: 'service', calculation: 'FIXED', baseMode: 'RUNNING_TOTAL', amount: '2', effect: 'ADD', distribution: 'EQUAL' },
      ],
    }),
  );

  assert.equal(result.grandTotal, '101');
  assert.deepEqual(
    result.participants.map(_participant => _participant.totalDue),
    ['34', '34', '33'],
  );
  assert.equal(result.allocatedTotal, '101');
});

test('draft allocation parsial mempertahankan bagian yang belum teralokasi', () => {
  const result = calculateSplitBill(
    baseInput({
      items: [
        {
          uuid: 'partial',
          quantity: 3,
          priceMode: 'LINE_TOTAL',
          lineTotal: '100',
          allocations: [{ participantUuid: 'participant-a', quantity: 1 }],
        },
      ],
    }),
  );

  assert.equal(result.isFullyAllocated, false);
  assert.equal(result.allocatedTotal, '33');
  assert.equal(result.unallocatedTotal, '67');
});
