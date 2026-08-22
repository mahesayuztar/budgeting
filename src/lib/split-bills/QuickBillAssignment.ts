export type QuickBillAllocations = Record<string, number>;

/** Menjumlahkan unit yang sudah di-assign pada satu item. */
export function allocatedQuantity(allocations: QuickBillAllocations) {
  return Object.values(allocations).reduce((_total, _quantity) => _total + _quantity, 0);
}

/** Menambah satu unit tanpa pernah melewati quantity item. */
export function addAllocationUnit(allocations: QuickBillAllocations, itemQuantity: number, participantUuid: string) {
  if (allocatedQuantity(allocations) >= itemQuantity) return allocations;
  return { ...allocations, [participantUuid]: (allocations[participantUuid] ?? 0) + 1 };
}

/** Mengurangi satu unit dan menghapus key ketika jumlahnya mencapai nol. */
export function removeAllocationUnit(allocations: QuickBillAllocations, participantUuid: string) {
  const current = allocations[participantUuid] ?? 0;
  if (current <= 0) return allocations;
  const next = { ...allocations };
  if (current === 1) delete next[participantUuid];
  else next[participantUuid] = current - 1;
  return next;
}

/** Memberikan seluruh unit tersisa kepada satu peserta. */
export function assignAllocationRemainder(allocations: QuickBillAllocations, itemQuantity: number, participantUuid: string) {
  const remaining = itemQuantity - allocatedQuantity(allocations);
  if (remaining <= 0) return allocations;
  return { ...allocations, [participantUuid]: (allocations[participantUuid] ?? 0) + remaining };
}

/** Membagi unit tersisa round-robin mengikuti urutan peserta yang terlihat. */
export function spreadAllocationRemainder(allocations: QuickBillAllocations, itemQuantity: number, participantUuids: string[]) {
  if (participantUuids.length === 0) return allocations;
  let next = { ...allocations };
  let remaining = itemQuantity - allocatedQuantity(next);
  let cursor = 0;
  while (remaining > 0) {
    next = addAllocationUnit(next, itemQuantity, participantUuids[cursor % participantUuids.length]);
    remaining -= 1;
    cursor += 1;
  }
  return next;
}
