import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { ConflictError, NotFoundError } from '@/src/lib/Errors';
import { formatDateID, monthRange, toDateOnly, yearRange } from '@/src/helpers/DateHelper';
import { buildPage, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, type Page } from '@/src/helpers/PaginationHelper';
import { calculateSplitBill, type SplitBillCalculationResult } from './SplitBillCalculator';
import { splitBillDetailSelect, splitBillListSelect, toSplitBillDTO, toSplitBillListDTO, type SplitBillDTO, type SplitBillListDTO } from './SplitBillDto';
import type { SplitBillDuplicateInput, SplitBillInput, SplitBillListParams, SplitBillUpdateInput } from './SplitBillValidator';

const SPLIT_BILL_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

export type SplitBillSummaryDTO = {
  count: number;
  draftCount: number;
  finalizedCount: number;
  total: number;
};

export type SplitBillSuggestionsDTO = {
  recentNames: string[];
  lastGroup: { billUuid: string; label: string; names: string[] } | null;
};

function optionalText(value?: string | null) {
  return value?.trim() || null;
}

function resolveTitle(input: SplitBillInput) {
  return input.title.trim() || input.merchantName?.trim() || `Tagihan ${formatDateID(input.occurredAt)}`;
}

function decimal(value: string) {
  return new Prisma.Decimal(value);
}

function buildPeriodFilter(params: SplitBillListParams): Prisma.SplitBillWhereInput {
  if (!params.year) return {};
  const { start, end } = params.month ? monthRange(params.year, params.month) : yearRange(params.year);
  return { occurredAt: { gte: start, lt: end } };
}

function buildSearchFilter(q?: string): Prisma.SplitBillWhereInput {
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { merchantName: { contains: q, mode: 'insensitive' } },
      { participants: { some: { name: { contains: q, mode: 'insensitive' } } } },
    ],
  };
}

function buildCursorFilter(cursor?: string): Prisma.SplitBillWhereInput {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 2) return {};
  const occurredAt = toDateOnly(parts[0]);
  const id = Number(parts[1]);
  if (!Number.isInteger(id) || id <= 0) return {};
  return { OR: [{ occurredAt: { lt: occurredAt } }, { occurredAt, id: { lt: id } }] };
}

async function writeAggregateChildren(transaction: Prisma.TransactionClient, splitBillId: number, input: SplitBillInput, calculation: SplitBillCalculationResult) {
  if (input.participants.length > 0) {
    await transaction.splitBillParticipant.createMany({
      data: input.participants.map(_participant => ({
        uuid: _participant.uuid,
        splitBillId,
        name: _participant.name,
        isPayer: _participant.isPayer,
        sortOrder: _participant.sortOrder,
      })),
    });
  }

  const participantRows = await transaction.splitBillParticipant.findMany({
    where: { splitBillId },
    select: { id: true, uuid: true },
  });
  const participantIds = new Map(participantRows.map(_participant => [_participant.uuid, _participant.id]));
  const calculatedItems = new Map(calculation.items.map(_item => [_item.uuid, _item]));

  if (input.items.length > 0) {
    await transaction.splitBillItem.createMany({
      data: input.items.map(_item => {
        const result = calculatedItems.get(_item.uuid);
        if (!result) throw new Error('Snapshot kalkulasi item tidak ditemukan.');
        return {
          uuid: _item.uuid,
          splitBillId,
          name: _item.name,
          quantity: _item.quantity,
          priceMode: _item.priceMode,
          unitPrice: _item.priceMode === 'UNIT_PRICE' ? decimal(_item.unitPrice as string) : null,
          lineTotal: _item.priceMode === 'LINE_TOTAL' ? decimal(_item.lineTotal as string) : null,
          discountAmount: decimal(result.discountAmount),
          grossAmount: decimal(result.grossAmount),
          netAmount: decimal(result.netAmount),
          sortOrder: _item.sortOrder,
        };
      }),
    });
  }

  const itemRows = await transaction.splitBillItem.findMany({
    where: { splitBillId },
    select: { id: true, uuid: true },
  });
  const itemIds = new Map(itemRows.map(_item => [_item.uuid, _item.id]));
  const allocationData = input.items.flatMap(_item => {
    const itemId = itemIds.get(_item.uuid);
    const result = calculatedItems.get(_item.uuid);
    if (!itemId || !result) throw new Error('Item allocation tidak dapat dipetakan.');
    const amounts = new Map(result.allocations.map(_allocation => [_allocation.participantUuid, _allocation.amount]));

    return _item.allocations.map(_allocation => {
      const participantId = participantIds.get(_allocation.participantUuid);
      const amount = amounts.get(_allocation.participantUuid);
      if (!participantId || amount === undefined) throw new Error('Peserta allocation tidak dapat dipetakan.');
      return { itemId, participantId, quantity: _allocation.quantity, amount: decimal(amount) };
    });
  });

  if (allocationData.length > 0) await transaction.splitBillItemAllocation.createMany({ data: allocationData });

  const calculatedAdjustments = new Map(calculation.adjustments.map(_adjustment => [_adjustment.uuid, _adjustment]));
  if (input.adjustments.length > 0) {
    await transaction.splitBillAdjustment.createMany({
      data: input.adjustments.map(_adjustment => {
        const result = calculatedAdjustments.get(_adjustment.uuid);
        if (!result) throw new Error('Snapshot kalkulasi adjustment tidak ditemukan.');
        return {
          uuid: _adjustment.uuid,
          splitBillId,
          label: _adjustment.label,
          kind: _adjustment.kind,
          calculation: _adjustment.calculation,
          baseMode: _adjustment.baseMode,
          effect: _adjustment.effect,
          distribution: _adjustment.distribution,
          rate: _adjustment.calculation === 'PERCENT' ? new Prisma.Decimal(_adjustment.rate as string) : null,
          baseAmount: decimal(result.baseAmount),
          amount: decimal(result.amount),
          sortOrder: _adjustment.sortOrder,
        };
      }),
    });
  }
}

function scalarData(input: SplitBillInput, calculation: SplitBillCalculationResult) {
  return {
    title: resolveTitle(input),
    merchantName: optionalText(input.merchantName),
    receiptNumber: optionalText(input.receiptNumber),
    occurredAt: toDateOnly(input.occurredAt),
    note: optionalText(input.note),
    currency: input.currency,
    status: input.status,
    expectedReceiptTotal: input.expectedReceiptTotal ? decimal(input.expectedReceiptTotal) : null,
    itemsSubtotal: decimal(calculation.itemsSubtotal),
    adjustmentTotal: decimal(calculation.adjustmentTotal),
    grandTotal: decimal(calculation.grandTotal),
  } satisfies Prisma.SplitBillUncheckedUpdateInput;
}

class SplitBillService {
  async suggestions(userId: number): Promise<SplitBillSuggestionsDTO> {
    const bills = await prisma.splitBill.findMany({
      where: { userId, participants: { some: {} } },
      select: {
        uuid: true,
        title: true,
        merchantName: true,
        participants: { select: { name: true, sortOrder: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 12,
    });
    const recentNames: string[] = [];
    const seen = new Set<string>();
    for (const _bill of bills) {
      for (const _participant of _bill.participants) {
        const key = _participant.name.toLocaleLowerCase('id-ID');
        if (seen.has(key)) continue;
        seen.add(key);
        recentNames.push(_participant.name);
        if (recentNames.length >= 12) break;
      }
      if (recentNames.length >= 12) break;
    }
    const last = bills[0];
    return {
      recentNames,
      lastGroup: last
        ? {
            billUuid: last.uuid,
            label: last.merchantName || last.title,
            names: last.participants.map(_participant => _participant.name),
          }
        : null,
    };
  }

  async list(userId: number, params: SplitBillListParams = {}): Promise<Page<SplitBillListDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const rows = await prisma.splitBill.findMany({
      where: {
        userId,
        ...(params.status ? { status: params.status } : {}),
        AND: [buildPeriodFilter(params), buildSearchFilter(params.q), buildCursorFilter(params.cursor)],
      },
      select: { ...splitBillListSelect, id: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    return buildPage(rows, limit, toSplitBillListDTO, _row => encodeCursor([_row.occurredAt.toISOString().slice(0, 10), _row.id]));
  }

  async summarize(userId: number, params: Pick<SplitBillListParams, 'year' | 'month'> = {}): Promise<SplitBillSummaryDTO> {
    const where = { userId, ...buildPeriodFilter(params) };
    const [aggregate, statuses] = await Promise.all([
      prisma.splitBill.aggregate({ where, _count: { _all: true }, _sum: { grandTotal: true } }),
      prisma.splitBill.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ]);
    const statusCounts = new Map(statuses.map(_row => [_row.status, _row._count._all]));
    return {
      count: aggregate._count._all,
      draftCount: statusCounts.get('DRAFT') ?? 0,
      finalizedCount: statusCounts.get('FINALIZED') ?? 0,
      total: Number(aggregate._sum.grandTotal ?? 0),
    };
  }

  async get(userId: number, uuid: string): Promise<SplitBillDTO> {
    const row = await prisma.splitBill.findFirst({ where: { uuid, userId }, select: splitBillDetailSelect });
    if (!row) throw new NotFoundError('Tagihan tidak ditemukan.');
    return toSplitBillDTO(row);
  }

  async create(userId: number, input: SplitBillInput): Promise<SplitBillDTO> {
    const calculation = calculateSplitBill(input);
    const row = await prisma.$transaction(async transaction => {
      const bill = await transaction.splitBill.create({
        data: { userId, ...scalarData(input, calculation) },
        select: { id: true },
      });
      await writeAggregateChildren(transaction, bill.id, input, calculation);
      return transaction.splitBill.findUniqueOrThrow({ where: { id: bill.id }, select: splitBillDetailSelect });
    }, SPLIT_BILL_TRANSACTION_OPTIONS);
    return toSplitBillDTO(row);
  }

  async update(userId: number, uuid: string, input: SplitBillUpdateInput): Promise<SplitBillDTO> {
    const calculation = calculateSplitBill(input);
    const row = await prisma.$transaction(async transaction => {
      const current = await transaction.splitBill.findFirst({ where: { uuid, userId }, select: { id: true, version: true, status: true } });
      if (!current) throw new NotFoundError('Tagihan tidak ditemukan.');
      if (current.status === 'FINALIZED') throw new ConflictError('Tagihan final tidak dapat diubah. Duplikat tagihan jika perlu membuat revisi.');
      if (current.version !== input.version) throw new ConflictError('Tagihan sudah berubah di tab atau perangkat lain. Muat ulang sebelum menyimpan.');

      const updated = await transaction.splitBill.updateMany({
        where: { id: current.id, userId, version: input.version, status: 'DRAFT' },
        data: { ...scalarData(input, calculation), version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictError('Tagihan sudah berubah di tab atau perangkat lain. Muat ulang sebelum menyimpan.');

      await transaction.splitBillAdjustment.deleteMany({ where: { splitBillId: current.id } });
      await transaction.splitBillItem.deleteMany({ where: { splitBillId: current.id } });
      await transaction.splitBillParticipant.deleteMany({ where: { splitBillId: current.id } });
      await writeAggregateChildren(transaction, current.id, input, calculation);
      return transaction.splitBill.findUniqueOrThrow({ where: { id: current.id }, select: splitBillDetailSelect });
    }, SPLIT_BILL_TRANSACTION_OPTIONS);
    return toSplitBillDTO(row);
  }

  async remove(userId: number, uuid: string): Promise<void> {
    const deleted = await prisma.splitBill.deleteMany({ where: { uuid, userId } });
    if (deleted.count !== 1) throw new NotFoundError('Tagihan tidak ditemukan.');
  }

  async duplicate(userId: number, uuid: string, input: SplitBillDuplicateInput): Promise<SplitBillDTO> {
    const source = await this.get(userId, uuid);
    const participantUuidMap = new Map(source.participants.map(_participant => [_participant.uuid, randomUUID()]));
    const copyItems = input.mode === 'FULL';
    const titleBase = source.title
      .replace(/\s+\(Salinan\)$/i, '')
      .slice(0, 108)
      .trim();
    const duplicateInput: SplitBillInput = {
      title: `${titleBase} (Salinan)`,
      merchantName: source.merchantName,
      receiptNumber: null,
      occurredAt: new Date().toISOString().slice(0, 10),
      note: source.note,
      currency: 'IDR',
      status: 'DRAFT',
      expectedReceiptTotal: null,
      participants: source.participants.map(_participant => ({
        uuid: participantUuidMap.get(_participant.uuid) as string,
        name: _participant.name,
        isPayer: _participant.isPayer,
        sortOrder: _participant.sortOrder,
      })),
      items: copyItems
        ? source.items.map(_item => ({
            uuid: randomUUID(),
            name: _item.name,
            quantity: _item.quantity,
            priceMode: _item.priceMode,
            unitPrice: _item.priceMode === 'UNIT_PRICE' ? String(_item.unitPrice) : null,
            lineTotal: _item.priceMode === 'LINE_TOTAL' ? String(_item.lineTotal) : null,
            discountAmount: String(_item.discountAmount),
            sortOrder: _item.sortOrder,
            allocations: _item.allocations.map(_allocation => ({
              participantUuid: participantUuidMap.get(_allocation.participantUuid) as string,
              quantity: _allocation.quantity,
            })),
          }))
        : [],
      adjustments: copyItems
        ? source.adjustments.map(_adjustment => ({
            uuid: randomUUID(),
            label: _adjustment.label,
            kind: _adjustment.kind,
            calculation: _adjustment.calculation,
            baseMode: _adjustment.baseMode,
            effect: _adjustment.effect,
            distribution: _adjustment.distribution,
            rate: _adjustment.calculation === 'PERCENT' ? String(_adjustment.rate) : null,
            baseAmount: _adjustment.baseMode === 'CUSTOM' ? String(_adjustment.baseAmount) : null,
            amount: _adjustment.calculation === 'FIXED' ? String(_adjustment.amount) : null,
            sortOrder: _adjustment.sortOrder,
          }))
        : [],
    };
    return this.create(userId, duplicateInput);
  }
}

export const splitBillService = new SplitBillService();
