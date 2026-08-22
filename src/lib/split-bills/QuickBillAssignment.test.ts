import assert from 'node:assert/strict';
import test from 'node:test';
import { addAllocationUnit, allocatedQuantity, assignAllocationRemainder, removeAllocationUnit, spreadAllocationRemainder } from './QuickBillAssignment';

test('assignment tidak dapat melewati quantity item', () => {
  const full = { ayu: 2, budi: 2 };
  assert.deepEqual(addAllocationUnit(full, 4, 'citra'), full);
  assert.equal(allocatedQuantity(full), 4);
});

test('item qty 4 hanya dapat memiliki maksimal 4 peserta berbeda', () => {
  let allocations = {};
  for (const name of ['ayu', 'budi', 'citra', 'dodi', 'eka']) allocations = addAllocationUnit(allocations, 4, name);
  assert.deepEqual(allocations, { ayu: 1, budi: 1, citra: 1, dodi: 1 });
});

test('seluruh sisa dapat diberikan lalu dikurangi tanpa menyisakan key nol', () => {
  const assigned = assignAllocationRemainder({ ayu: 1 }, 4, 'budi');
  assert.deepEqual(assigned, { ayu: 1, budi: 3 });
  assert.deepEqual(removeAllocationUnit({ ayu: 1 }, 'ayu'), {});
});

test('bagi rata sisa mengikuti urutan peserta dan reconcile', () => {
  const allocations = spreadAllocationRemainder({ ayu: 1 }, 5, ['ayu', 'budi', 'citra']);
  assert.deepEqual(allocations, { ayu: 3, budi: 1, citra: 1 });
  assert.equal(allocatedQuantity(allocations), 5);
});
