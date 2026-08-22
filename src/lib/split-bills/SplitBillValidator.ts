import { z } from 'zod';
import { cursorParamsSchema } from '@/src/helpers/PaginationHelper';
import { calculateSplitBill, getCurrencyScale, moneyToMinor } from './SplitBillCalculator';

const MAX_MONEY = 999_999_999_999;
const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;
const RATE_PATTERN = /^\d{1,4}(?:\.\d{1,4})?$/;

const moneySchema = z
  .union([z.string(), z.number()])
  .transform(_value => String(_value).trim())
  .refine(_value => MONEY_PATTERN.test(_value), 'Nominal tidak valid.')
  .refine(_value => Number(_value) <= MAX_MONEY, 'Nominal terlalu besar.');

const positiveMoneySchema = moneySchema.refine(_value => Number(_value) > 0, 'Nominal harus lebih dari 0.');

const rateSchema = z
  .union([z.string(), z.number()])
  .transform(_value => String(_value).trim())
  .refine(_value => RATE_PATTERN.test(_value), 'Persentase tidak valid.')
  .refine(_value => Number(_value) > 0 && Number(_value) <= 1000, 'Persentase harus di antara 0 dan 1.000.');

export const splitBillParticipantSchema = z.object({
  uuid: z.uuid('ID peserta tidak valid.'),
  name: z.string().trim().min(1, 'Nama peserta wajib diisi.').max(80, 'Nama peserta maksimal 80 karakter.'),
  isPayer: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999),
});

export const splitBillAllocationSchema = z.object({
  participantUuid: z.uuid('Peserta allocation tidak valid.'),
  quantity: z.number().int().min(1, 'Kuantitas pembagian minimal 1.').max(999),
});

export const splitBillItemSchema = z.object({
  uuid: z.uuid('ID item tidak valid.'),
  name: z.string().trim().min(1, 'Nama item wajib diisi.').max(120, 'Nama item maksimal 120 karakter.'),
  quantity: z.number().int().min(1, 'Kuantitas minimal 1.').max(999, 'Kuantitas maksimal 999.'),
  priceMode: z.enum(['UNIT_PRICE', 'LINE_TOTAL']),
  unitPrice: positiveMoneySchema.nullish(),
  lineTotal: positiveMoneySchema.nullish(),
  discountAmount: moneySchema.default('0'),
  sortOrder: z.number().int().min(0).max(999),
  allocations: z.array(splitBillAllocationSchema).max(1000).default([]),
});

export const splitBillAdjustmentSchema = z.object({
  uuid: z.uuid('ID adjustment tidak valid.'),
  label: z.string().trim().min(1, 'Label adjustment wajib diisi.').max(80, 'Label adjustment maksimal 80 karakter.'),
  kind: z.enum(['DISCOUNT', 'TAX', 'SERVICE', 'ROUNDING', 'OTHER']),
  calculation: z.enum(['FIXED', 'PERCENT']),
  baseMode: z.enum(['ITEMS_NET', 'RUNNING_TOTAL', 'CUSTOM']),
  effect: z.enum(['ADD', 'SUBTRACT', 'INCLUDED']),
  distribution: z.enum(['PROPORTIONAL', 'EQUAL']),
  rate: rateSchema.nullish(),
  baseAmount: moneySchema.nullish(),
  amount: positiveMoneySchema.nullish(),
  sortOrder: z.number().int().min(0).max(999),
});

const splitBillBaseSchema = z.object({
  title: z.string().trim().max(120, 'Judul maksimal 120 karakter.').default(''),
  merchantName: z.string().trim().max(120, 'Nama merchant maksimal 120 karakter.').nullish(),
  receiptNumber: z.string().trim().max(80, 'Nomor struk maksimal 80 karakter.').nullish(),
  occurredAt: z.iso.date('Tanggal tidak valid.'),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter.').nullish(),
  currency: z.literal('IDR').default('IDR'),
  status: z.enum(['DRAFT', 'FINALIZED']).default('DRAFT'),
  expectedReceiptTotal: moneySchema.nullish(),
  participants: z.array(splitBillParticipantSchema).max(100, 'Maksimal 100 peserta.').default([]),
  items: z.array(splitBillItemSchema).max(250, 'Maksimal 250 item.').default([]),
  adjustments: z.array(splitBillAdjustmentSchema).max(50, 'Maksimal 50 adjustment.').default([]),
});

type SplitBillBaseInput = z.infer<typeof splitBillBaseSchema>;

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: 'custom', path, message });
}

function validateUniqueValues(values: Array<{ value: string | number; path: PropertyKey[] }>, context: z.RefinementCtx, message: string) {
  const seen = new Set<string | number>();
  for (const _entry of values) {
    if (seen.has(_entry.value)) addIssue(context, _entry.path, message);
    seen.add(_entry.value);
  }
}

/**
 * Memvalidasi invariant lintas-field dan lintas-baris satu aggregate bill.
 * Draft boleh belum lengkap, sedangkan FINALIZED harus reconcile seluruh unit
 * dan nominal berdasarkan calculation engine yang sama dengan service.
 * @param {SplitBillBaseInput} input - Aggregate hasil parsing field dasar.
 * @param {z.RefinementCtx} context - Pengumpul issue Zod.
 * @returns {void}
 */
function validateSplitBillAggregate(input: SplitBillBaseInput, context: z.RefinementCtx) {
  validateUniqueValues(
    input.participants.map((_participant, _index) => ({ value: _participant.uuid, path: ['participants', _index, 'uuid'] })),
    context,
    'ID peserta duplikat.',
  );
  validateUniqueValues(
    input.participants.map((_participant, _index) => ({ value: _participant.name.toLocaleLowerCase('id-ID'), path: ['participants', _index, 'name'] })),
    context,
    'Nama peserta tidak boleh duplikat.',
  );
  validateUniqueValues(
    input.participants.map((_participant, _index) => ({ value: _participant.sortOrder, path: ['participants', _index, 'sortOrder'] })),
    context,
    'Urutan peserta tidak boleh duplikat.',
  );
  validateUniqueValues(
    input.items.map((_item, _index) => ({ value: _item.uuid, path: ['items', _index, 'uuid'] })),
    context,
    'ID item duplikat.',
  );
  validateUniqueValues(
    input.items.map((_item, _index) => ({ value: _item.sortOrder, path: ['items', _index, 'sortOrder'] })),
    context,
    'Urutan item tidak boleh duplikat.',
  );
  validateUniqueValues(
    input.adjustments.map((_adjustment, _index) => ({ value: _adjustment.uuid, path: ['adjustments', _index, 'uuid'] })),
    context,
    'ID adjustment duplikat.',
  );
  validateUniqueValues(
    input.adjustments.map((_adjustment, _index) => ({ value: _adjustment.sortOrder, path: ['adjustments', _index, 'sortOrder'] })),
    context,
    'Urutan adjustment tidak boleh duplikat.',
  );

  const participantUuids = new Set(input.participants.map(_participant => _participant.uuid));
  const payerCount = input.participants.filter(_participant => _participant.isPayer).length;
  if (payerCount > 1) addIssue(context, ['participants'], 'Pembayar utama maksimal satu orang.');

  const currencyScale = getCurrencyScale(input.currency);

  input.items.forEach((_item, _itemIndex) => {
    if (_item.priceMode === 'UNIT_PRICE') {
      if (!_item.unitPrice) addIssue(context, ['items', _itemIndex, 'unitPrice'], 'Harga per unit wajib diisi.');
      if (_item.lineTotal) addIssue(context, ['items', _itemIndex, 'lineTotal'], 'Total baris harus kosong pada mode harga per unit.');
    } else {
      if (!_item.lineTotal) addIssue(context, ['items', _itemIndex, 'lineTotal'], 'Total baris wajib diisi.');
      if (_item.unitPrice) addIssue(context, ['items', _itemIndex, 'unitPrice'], 'Harga per unit harus kosong pada mode total baris.');
    }

    const grossAmount = _item.priceMode === 'UNIT_PRICE' ? moneyToMinor(_item.unitPrice, currencyScale) * BigInt(_item.quantity) : moneyToMinor(_item.lineTotal, currencyScale);
    if (moneyToMinor(_item.discountAmount, currencyScale) > grossAmount) {
      addIssue(context, ['items', _itemIndex, 'discountAmount'], 'Diskon item tidak boleh melebihi nilai kotor item.');
    }

    validateUniqueValues(
      _item.allocations.map((_allocation, _allocationIndex) => ({
        value: _allocation.participantUuid,
        path: ['items', _itemIndex, 'allocations', _allocationIndex, 'participantUuid'],
      })),
      context,
      'Peserta hanya boleh muncul sekali pada satu item.',
    );

    _item.allocations.forEach((_allocation, _allocationIndex) => {
      if (!participantUuids.has(_allocation.participantUuid)) {
        addIssue(context, ['items', _itemIndex, 'allocations', _allocationIndex, 'participantUuid'], 'Peserta tidak ada dalam bill ini.');
      }
    });

    const allocatedQuantity = _item.allocations.reduce((_total, _allocation) => _total + _allocation.quantity, 0);
    if (allocatedQuantity > _item.quantity) {
      addIssue(context, ['items', _itemIndex, 'allocations'], `Total unit yang dibagi maksimal ${_item.quantity}.`);
    }
    if (_item.allocations.length > _item.quantity) {
      addIssue(context, ['items', _itemIndex, 'allocations'], `Item ini maksimal dapat dibagi kepada ${_item.quantity} peserta.`);
    }
    if (input.status === 'FINALIZED' && allocatedQuantity !== _item.quantity) {
      addIssue(context, ['items', _itemIndex, 'allocations'], `Seluruh ${_item.quantity} unit wajib dibagi sebelum finalisasi.`);
    }
  });

  input.adjustments.forEach((_adjustment, _index) => {
    if (_adjustment.calculation === 'FIXED') {
      if (!_adjustment.amount) addIssue(context, ['adjustments', _index, 'amount'], 'Nominal adjustment wajib diisi.');
      if (_adjustment.rate) addIssue(context, ['adjustments', _index, 'rate'], 'Persentase harus kosong untuk adjustment nominal.');
    } else {
      if (!_adjustment.rate) addIssue(context, ['adjustments', _index, 'rate'], 'Persentase wajib diisi.');
      if (_adjustment.amount) addIssue(context, ['adjustments', _index, 'amount'], 'Nominal dihitung otomatis untuk adjustment persen.');
    }

    if (_adjustment.baseMode === 'CUSTOM' && _adjustment.baseAmount == null) {
      addIssue(context, ['adjustments', _index, 'baseAmount'], 'DPP/basis khusus wajib diisi.');
    }
  });

  let calculation: ReturnType<typeof calculateSplitBill>;
  try {
    calculation = calculateSplitBill(input);
  } catch {
    addIssue(context, ['_'], 'Kalkulasi tagihan tidak valid.');
    return;
  }

  const grandTotalIsNegative = calculation.grandTotal.startsWith('-');
  if (grandTotalIsNegative) {
    addIssue(context, ['adjustments'], 'Adjustment tidak boleh membuat grand total negatif.');
  }

  if (input.status !== 'FINALIZED') return;

  if (input.participants.length === 0) addIssue(context, ['participants'], 'Minimal satu peserta diperlukan untuk finalisasi.');
  if (input.items.length === 0) addIssue(context, ['items'], 'Minimal satu item diperlukan untuk finalisasi.');
  if (grandTotalIsNegative || moneyToMinor(calculation.grandTotal, calculation.currencyScale) <= BigInt(0)) {
    addIssue(context, ['_'], 'Grand total harus lebih dari nol.');
  }
  if (!calculation.isFullyAllocated || calculation.allocatedTotal !== calculation.grandTotal) {
    addIssue(context, ['items'], 'Jumlah pembagian peserta harus tepat sama dengan grand total.');
  }
  if (calculation.participants.some(_participant => _participant.totalDue.startsWith('-'))) {
    addIssue(context, ['adjustments'], 'Adjustment membuat total salah satu peserta menjadi negatif.');
  }
  if (
    input.expectedReceiptTotal &&
    !grandTotalIsNegative &&
    moneyToMinor(input.expectedReceiptTotal, calculation.currencyScale) !== moneyToMinor(calculation.grandTotal, calculation.currencyScale)
  ) {
    addIssue(context, ['expectedReceiptTotal'], 'Total hasil hitung belum sama dengan total pada struk.');
  }
}

export const splitBillSchema = splitBillBaseSchema.superRefine(validateSplitBillAggregate);
export type SplitBillInput = z.infer<typeof splitBillSchema>;

export const splitBillUpdateSchema = splitBillBaseSchema.extend({ version: z.number().int().min(1, 'Versi data tidak valid.') }).superRefine(validateSplitBillAggregate);
export type SplitBillUpdateInput = z.infer<typeof splitBillUpdateSchema>;

export const splitBillListSchema = cursorParamsSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(['DRAFT', 'FINALIZED']).optional(),
});

export type SplitBillListParams = z.infer<typeof splitBillListSchema>;

export const splitBillDuplicateSchema = z.object({
  mode: z.enum(['FULL', 'PARTICIPANTS_ONLY']).default('FULL'),
});

export type SplitBillDuplicateInput = z.infer<typeof splitBillDuplicateSchema>;
