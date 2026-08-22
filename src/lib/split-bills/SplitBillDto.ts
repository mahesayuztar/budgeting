import type {
  Prisma,
  SplitBillAdjustmentBase,
  SplitBillAdjustmentCalculation,
  SplitBillAdjustmentDistribution,
  SplitBillAdjustmentEffect,
  SplitBillAdjustmentKind,
  SplitBillPriceMode,
  SplitBillStatus,
} from '@prisma/client';
import { toAmount } from '@/src/helpers/MoneyHelper';

export type SplitBillParticipantDTO = {
  uuid: string;
  name: string;
  isPayer: boolean;
  sortOrder: number;
};

export type SplitBillAllocationDTO = {
  participantUuid: string;
  quantity: number;
  amount: number;
};

export type SplitBillItemDTO = {
  uuid: string;
  name: string;
  quantity: number;
  priceMode: SplitBillPriceMode;
  unitPrice: number | null;
  lineTotal: number | null;
  discountAmount: number;
  grossAmount: number;
  netAmount: number;
  sortOrder: number;
  allocations: SplitBillAllocationDTO[];
};

export type SplitBillAdjustmentDTO = {
  uuid: string;
  label: string;
  kind: SplitBillAdjustmentKind;
  calculation: SplitBillAdjustmentCalculation;
  baseMode: SplitBillAdjustmentBase;
  effect: SplitBillAdjustmentEffect;
  distribution: SplitBillAdjustmentDistribution;
  rate: number | null;
  baseAmount: number | null;
  amount: number;
  sortOrder: number;
};

export type SplitBillDTO = {
  uuid: string;
  title: string;
  merchantName: string | null;
  receiptNumber: string | null;
  occurredAt: string;
  note: string | null;
  currency: string;
  status: SplitBillStatus;
  expectedReceiptTotal: number | null;
  itemsSubtotal: number;
  adjustmentTotal: number;
  grandTotal: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  participants: SplitBillParticipantDTO[];
  items: SplitBillItemDTO[];
  adjustments: SplitBillAdjustmentDTO[];
};

export type SplitBillListDTO = {
  uuid: string;
  title: string;
  merchantName: string | null;
  occurredAt: string;
  status: SplitBillStatus;
  grandTotal: number;
  participantCount: number;
  itemCount: number;
  completedItemCount: number;
  updatedAt: string;
};

export const splitBillDetailSelect = {
  uuid: true,
  title: true,
  merchantName: true,
  receiptNumber: true,
  occurredAt: true,
  note: true,
  currency: true,
  status: true,
  expectedReceiptTotal: true,
  itemsSubtotal: true,
  adjustmentTotal: true,
  grandTotal: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  participants: {
    select: { uuid: true, name: true, isPayer: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  items: {
    select: {
      uuid: true,
      name: true,
      quantity: true,
      priceMode: true,
      unitPrice: true,
      lineTotal: true,
      discountAmount: true,
      grossAmount: true,
      netAmount: true,
      sortOrder: true,
      allocations: {
        select: {
          quantity: true,
          amount: true,
          participant: { select: { uuid: true, sortOrder: true } },
        },
        orderBy: [{ participant: { sortOrder: 'asc' as const } }, { id: 'asc' as const }],
      },
    },
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  adjustments: {
    select: {
      uuid: true,
      label: true,
      kind: true,
      calculation: true,
      baseMode: true,
      effect: true,
      distribution: true,
      rate: true,
      baseAmount: true,
      amount: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.SplitBillSelect;

export const splitBillListSelect = {
  uuid: true,
  title: true,
  merchantName: true,
  occurredAt: true,
  status: true,
  grandTotal: true,
  updatedAt: true,
  participants: { select: { id: true } },
  items: {
    select: {
      quantity: true,
      allocations: { select: { quantity: true } },
    },
  },
} satisfies Prisma.SplitBillSelect;

type SplitBillDetailRow = Prisma.SplitBillGetPayload<{ select: typeof splitBillDetailSelect }>;
type SplitBillListRow = Prisma.SplitBillGetPayload<{ select: typeof splitBillListSelect }>;

/**
 * Mengubah aggregate Prisma menjadi DTO detail yang aman melewati batas server
 * ke client. Decimal diubah menjadi number dan tanggal menjadi ISO string.
 * @param {SplitBillDetailRow} row - Aggregate bill beserta seluruh child record.
 * @returns {SplitBillDTO} DTO detail siap dikirim melalui API.
 */
export function toSplitBillDTO(row: SplitBillDetailRow): SplitBillDTO {
  return {
    uuid: row.uuid,
    title: row.title,
    merchantName: row.merchantName,
    receiptNumber: row.receiptNumber,
    occurredAt: row.occurredAt.toISOString().slice(0, 10),
    note: row.note,
    currency: row.currency,
    status: row.status,
    expectedReceiptTotal: row.expectedReceiptTotal === null ? null : toAmount(row.expectedReceiptTotal),
    itemsSubtotal: toAmount(row.itemsSubtotal),
    adjustmentTotal: toAmount(row.adjustmentTotal),
    grandTotal: toAmount(row.grandTotal),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    participants: row.participants,
    items: row.items.map(_item => ({
      uuid: _item.uuid,
      name: _item.name,
      quantity: _item.quantity,
      priceMode: _item.priceMode,
      unitPrice: _item.unitPrice === null ? null : toAmount(_item.unitPrice),
      lineTotal: _item.lineTotal === null ? null : toAmount(_item.lineTotal),
      discountAmount: toAmount(_item.discountAmount),
      grossAmount: toAmount(_item.grossAmount),
      netAmount: toAmount(_item.netAmount),
      sortOrder: _item.sortOrder,
      allocations: _item.allocations.map(_allocation => ({
        participantUuid: _allocation.participant.uuid,
        quantity: _allocation.quantity,
        amount: toAmount(_allocation.amount),
      })),
    })),
    adjustments: row.adjustments.map(_adjustment => ({
      uuid: _adjustment.uuid,
      label: _adjustment.label,
      kind: _adjustment.kind,
      calculation: _adjustment.calculation,
      baseMode: _adjustment.baseMode,
      effect: _adjustment.effect,
      distribution: _adjustment.distribution,
      rate: _adjustment.rate === null ? null : toAmount(_adjustment.rate),
      baseAmount: _adjustment.baseAmount === null ? null : toAmount(_adjustment.baseAmount),
      amount: toAmount(_adjustment.amount),
      sortOrder: _adjustment.sortOrder,
    })),
  };
}

/**
 * Mengubah row ringkas menjadi DTO history dan menghitung progress item dari
 * total quantity allocation yang tersimpan.
 * @param {SplitBillListRow} row - Bill dengan relasi minimal untuk summary.
 * @returns {SplitBillListDTO} DTO ringkas untuk tabel/kartu history.
 */
export function toSplitBillListDTO(row: SplitBillListRow): SplitBillListDTO {
  return {
    uuid: row.uuid,
    title: row.title,
    merchantName: row.merchantName,
    occurredAt: row.occurredAt.toISOString().slice(0, 10),
    status: row.status,
    grandTotal: toAmount(row.grandTotal),
    participantCount: row.participants.length,
    itemCount: row.items.length,
    completedItemCount: row.items.filter(_item => _item.allocations.reduce((_total, _allocation) => _total + _allocation.quantity, 0) === _item.quantity).length,
    updatedAt: row.updatedAt.toISOString(),
  };
}
