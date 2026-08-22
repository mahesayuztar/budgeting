export type MoneyValue = string | number;

export type SplitBillParticipantCalculationInput = {
  uuid: string;
  sortOrder: number;
};

export type SplitBillAllocationCalculationInput = {
  participantUuid: string;
  quantity: number;
};

export type SplitBillItemCalculationInput = {
  uuid: string;
  quantity: number;
  priceMode: 'UNIT_PRICE' | 'LINE_TOTAL';
  unitPrice?: MoneyValue | null;
  lineTotal?: MoneyValue | null;
  discountAmount?: MoneyValue | null;
  allocations: SplitBillAllocationCalculationInput[];
};

export type SplitBillAdjustmentCalculationInput = {
  uuid: string;
  calculation: 'FIXED' | 'PERCENT';
  baseMode: 'ITEMS_NET' | 'RUNNING_TOTAL' | 'CUSTOM';
  effect: 'ADD' | 'SUBTRACT' | 'INCLUDED';
  distribution: 'PROPORTIONAL' | 'EQUAL';
  rate?: MoneyValue | null;
  baseAmount?: MoneyValue | null;
  amount?: MoneyValue | null;
};

export type SplitBillCalculationInput = {
  currency?: string;
  participants: SplitBillParticipantCalculationInput[];
  items: SplitBillItemCalculationInput[];
  adjustments: SplitBillAdjustmentCalculationInput[];
};

export type SplitBillAllocationCalculationResult = {
  participantUuid: string;
  quantity: number;
  amount: string;
};

export type SplitBillItemCalculationResult = {
  uuid: string;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
  allocatedQuantity: number;
  allocatedAmount: string;
  unallocatedAmount: string;
  isFullyAllocated: boolean;
  allocations: SplitBillAllocationCalculationResult[];
};

export type SplitBillAdjustmentCalculationResult = {
  uuid: string;
  baseAmount: string;
  amount: string;
  signedAmount: string;
};

export type SplitBillParticipantCalculationResult = {
  uuid: string;
  itemSubtotal: string;
  adjustmentTotal: string;
  totalDue: string;
};

export type SplitBillCalculationResult = {
  currency: string;
  currencyScale: number;
  itemsSubtotal: string;
  adjustmentTotal: string;
  grandTotal: string;
  allocatedTotal: string;
  unallocatedTotal: string;
  isFullyAllocated: boolean;
  items: SplitBillItemCalculationResult[];
  adjustments: SplitBillAdjustmentCalculationResult[];
  participants: SplitBillParticipantCalculationResult[];
};

type WeightedEntry = {
  key: string;
  weight: bigint;
  sortOrder: number;
};

type AllocatedMinor = {
  key: string;
  amount: bigint;
};

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const BIG_TWO = BigInt(2);
const BIG_TEN = BigInt(10);
const BIG_HUNDRED = BigInt(100);

/**
 * Menentukan jumlah digit minor untuk mata uang. V1 berfokus pada IDR yang
 * dibulatkan ke rupiah penuh; mata uang lain memakai dua digit sebagai default
 * aman hingga dukungan currency metadata ditambahkan.
 * @param {string} currency - Kode mata uang ISO.
 * @returns {number} Jumlah digit minor yang digunakan calculation engine.
 */
export function getCurrencyScale(currency: string) {
  return currency.toUpperCase() === 'IDR' ? 0 : 2;
}

/**
 * Membulatkan pembagian bilangan bulat non-negatif dengan aturan half-up.
 * Semua operasi uang lewat BigInt supaya hasil server dan browser identik.
 * @param {bigint} numerator - Pembilang non-negatif.
 * @param {bigint} denominator - Penyebut positif.
 * @returns {bigint} Hasil pembagian yang dibulatkan half-up.
 */
function divideHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= BIG_ZERO) throw new Error('Penyebut kalkulasi harus lebih dari nol.');
  if (numerator < BIG_ZERO) throw new Error('Pembilang kalkulasi tidak boleh negatif.');
  return (numerator * BIG_TWO + denominator) / (denominator * BIG_TWO);
}

/**
 * Mengubah nominal desimal menjadi unit minor mata uang secara deterministik.
 * Notasi ilmiah dan nilai negatif ditolak karena input domain selalu berupa
 * nominal positif; arah adjustment disimpan terpisah melalui `effect`.
 * @param {MoneyValue | null | undefined} value - Nominal string atau number.
 * @param {number} scale - Digit minor mata uang.
 * @returns {bigint} Nominal dalam unit minor.
 */
export function moneyToMinor(value: MoneyValue | null | undefined, scale: number) {
  if (value === null || value === undefined || value === '') return BIG_ZERO;

  const text = String(value).trim();
  if (!DECIMAL_PATTERN.test(text)) throw new Error(`Nominal tidak valid: ${text}`);

  const [integerPart, fractionPart = ''] = text.split('.');
  const paddedFraction = fractionPart.padEnd(scale + 1, '0');
  const keptFraction = scale > 0 ? paddedFraction.slice(0, scale) : '';
  const roundingDigit = Number(paddedFraction[scale] ?? '0');
  const factor = BIG_TEN ** BigInt(scale);
  let minor = BigInt(integerPart) * factor + BigInt(keptFraction || '0');
  if (roundingDigit >= 5) minor += BIG_ONE;

  return minor;
}

/**
 * Mengubah unit minor kembali menjadi string desimal kanonik yang aman dikirim
 * ke Prisma maupun client tanpa kehilangan presisi.
 * @param {bigint} value - Nominal dalam unit minor, boleh negatif untuk hasil adjustment.
 * @param {number} scale - Digit minor mata uang.
 * @returns {string} Nominal desimal kanonik.
 */
export function minorToMoney(value: bigint, scale: number) {
  const negative = value < BIG_ZERO;
  const absolute = negative ? -value : value;

  if (scale === 0) return `${negative ? '-' : ''}${absolute}`;

  const factor = BIG_TEN ** BigInt(scale);
  const integerPart = absolute / factor;
  const fractionPart = String(absolute % factor).padStart(scale, '0');
  return `${negative ? '-' : ''}${integerPart}.${fractionPart}`;
}

/**
 * Membaca angka desimal sebagai pecahan BigInt. Dipakai untuk rate persen agar
 * rate seperti 7.5 atau 11.25 tidak melewati floating point.
 * @param {MoneyValue | null | undefined} value - Rate desimal positif.
 * @returns {{ numerator: bigint; denominator: bigint }} Pecahan eksak rate.
 */
function decimalRatio(value: MoneyValue | null | undefined) {
  const text = String(value ?? '').trim();
  if (!DECIMAL_PATTERN.test(text)) throw new Error(`Persentase tidak valid: ${text}`);
  const [integerPart, fractionPart = ''] = text.split('.');
  const denominator = BIG_TEN ** BigInt(fractionPart.length);
  const numerator = BigInt(`${integerPart}${fractionPart}`);
  return { numerator, denominator };
}

/**
 * Membagi nominal menurut bobot dengan largest remainder. `denominatorWeight`
 * boleh lebih besar dari jumlah bobot untuk draft yang belum dialokasikan
 * penuh; pada kasus itu hanya porsi bobot yang terisi yang dibagikan.
 * @param {bigint} signedAmount - Nominal yang dibagi, boleh negatif.
 * @param {WeightedEntry[]} entries - Penerima, bobot, dan urutan tie-break.
 * @param {bigint} denominatorWeight - Total bobot keseluruhan.
 * @returns {AllocatedMinor[]} Nominal tiap penerima dengan jumlah yang eksak terhadap porsi teralokasi.
 */
function allocateByWeight(signedAmount: bigint, entries: WeightedEntry[], denominatorWeight: bigint): AllocatedMinor[] {
  if (entries.length === 0 || signedAmount === BIG_ZERO || denominatorWeight <= BIG_ZERO) return entries.map(_entry => ({ key: _entry.key, amount: BIG_ZERO }));

  const sign = signedAmount < BIG_ZERO ? -BIG_ONE : BIG_ONE;
  const amount = signedAmount < BIG_ZERO ? -signedAmount : signedAmount;
  const positiveEntries = entries.filter(_entry => _entry.weight > BIG_ZERO);
  const usedWeight = positiveEntries.reduce((_total, _entry) => _total + _entry.weight, BIG_ZERO);
  const target = divideHalfUp(amount * usedWeight, denominatorWeight);

  const floors = positiveEntries.map(_entry => {
    const numerator = amount * _entry.weight;
    return {
      ..._entry,
      amount: numerator / denominatorWeight,
      remainder: numerator % denominatorWeight,
    };
  });

  const remaining = target - floors.reduce((_total, _entry) => _total + _entry.amount, BIG_ZERO);
  const remainderOrder = [...floors].sort(
    (_left, _right) =>
      (_left.remainder === _right.remainder ? 0 : _left.remainder > _right.remainder ? -1 : 1) || _left.sortOrder - _right.sortOrder || _left.key.localeCompare(_right.key),
  );
  const bonuses = new Set(remainderOrder.slice(0, Number(remaining)).map(_entry => _entry.key));

  const allocated = new Map(floors.map(_entry => [_entry.key, (_entry.amount + (bonuses.has(_entry.key) ? BIG_ONE : BIG_ZERO)) * sign]));
  return entries.map(_entry => ({ key: _entry.key, amount: allocated.get(_entry.key) ?? BIG_ZERO }));
}

/**
 * Menghitung seluruh bill, allocation item, adjustment berurutan, dan total per
 * peserta. Fungsi tidak membaca database maupun state browser sehingga aman
 * dipakai untuk live preview, service, PDF, dan unit test.
 * @param {SplitBillCalculationInput} input - Seluruh input kanonik satu bill.
 * @returns {SplitBillCalculationResult} Snapshot kalkulasi berbentuk string desimal.
 */
export function calculateSplitBill(input: SplitBillCalculationInput): SplitBillCalculationResult {
  const currency = (input.currency ?? 'IDR').toUpperCase();
  const scale = getCurrencyScale(currency);
  const participantOrder = new Map(input.participants.map(_participant => [_participant.uuid, _participant.sortOrder]));
  const participantItemMinor = new Map(input.participants.map(_participant => [_participant.uuid, BIG_ZERO]));

  const calculatedItems = input.items.map(_item => {
    const grossMinor = _item.priceMode === 'UNIT_PRICE' ? moneyToMinor(_item.unitPrice, scale) * BigInt(_item.quantity) : moneyToMinor(_item.lineTotal, scale);
    const discountMinor = moneyToMinor(_item.discountAmount, scale);
    const netMinor = grossMinor - discountMinor;
    const allocatedQuantity = _item.allocations.reduce((_total, _allocation) => _total + _allocation.quantity, 0);
    const allocationMinor = allocateByWeight(
      netMinor,
      _item.allocations.map(_allocation => ({
        key: _allocation.participantUuid,
        weight: BigInt(_allocation.quantity),
        sortOrder: participantOrder.get(_allocation.participantUuid) ?? Number.MAX_SAFE_INTEGER,
      })),
      BigInt(_item.quantity),
    );

    for (const _allocation of allocationMinor) {
      participantItemMinor.set(_allocation.key, (participantItemMinor.get(_allocation.key) ?? BIG_ZERO) + _allocation.amount);
    }

    const allocatedAmountMinor = allocationMinor.reduce((_total, _allocation) => _total + _allocation.amount, BIG_ZERO);

    return {
      input: _item,
      uuid: _item.uuid,
      grossMinor,
      discountMinor,
      netMinor,
      allocatedQuantity,
      allocatedAmountMinor,
      allocationMinor,
      isFullyAllocated: allocatedQuantity === _item.quantity,
    };
  });

  const itemsSubtotalMinor = calculatedItems.reduce((_total, _item) => _total + _item.netMinor, BIG_ZERO);
  let runningTotalMinor = itemsSubtotalMinor;

  const calculatedAdjustments = input.adjustments.map(_adjustment => {
    const baseMinor =
      _adjustment.baseMode === 'ITEMS_NET' ? itemsSubtotalMinor : _adjustment.baseMode === 'CUSTOM' ? moneyToMinor(_adjustment.baseAmount, scale) : runningTotalMinor;
    const amountMinor =
      _adjustment.calculation === 'FIXED'
        ? moneyToMinor(_adjustment.amount, scale)
        : (() => {
            const rate = decimalRatio(_adjustment.rate);
            return divideHalfUp(baseMinor * rate.numerator, rate.denominator * BIG_HUNDRED);
          })();
    const signedMinor = _adjustment.effect === 'INCLUDED' ? BIG_ZERO : _adjustment.effect === 'SUBTRACT' ? -amountMinor : amountMinor;
    runningTotalMinor += signedMinor;

    return { input: _adjustment, baseMinor, amountMinor, signedMinor };
  });

  const adjustmentTotalMinor = calculatedAdjustments.reduce((_total, _adjustment) => _total + _adjustment.signedMinor, BIG_ZERO);
  const participantAdjustmentMinor = new Map(input.participants.map(_participant => [_participant.uuid, BIG_ZERO]));

  for (const _adjustment of calculatedAdjustments) {
    const eligible = input.participants.filter(_participant => (participantItemMinor.get(_participant.uuid) ?? BIG_ZERO) > BIG_ZERO);
    const weights = eligible.map(_participant => ({
      key: _participant.uuid,
      weight: _adjustment.input.distribution === 'EQUAL' ? BIG_ONE : (participantItemMinor.get(_participant.uuid) ?? BIG_ZERO),
      sortOrder: _participant.sortOrder,
    }));
    const denominator =
      _adjustment.input.distribution === 'EQUAL'
        ? BigInt(eligible.length)
        : itemsSubtotalMinor > BIG_ZERO
          ? itemsSubtotalMinor
          : weights.reduce((_total, _entry) => _total + _entry.weight, BIG_ZERO);
    const shares = allocateByWeight(_adjustment.signedMinor, weights, denominator);

    for (const _share of shares) {
      participantAdjustmentMinor.set(_share.key, (participantAdjustmentMinor.get(_share.key) ?? BIG_ZERO) + _share.amount);
    }
  }

  const participantResults = [...input.participants]
    .sort((_left, _right) => _left.sortOrder - _right.sortOrder || _left.uuid.localeCompare(_right.uuid))
    .map(_participant => {
      const itemMinor = participantItemMinor.get(_participant.uuid) ?? BIG_ZERO;
      const adjustmentMinor = participantAdjustmentMinor.get(_participant.uuid) ?? BIG_ZERO;
      return {
        uuid: _participant.uuid,
        itemSubtotal: minorToMoney(itemMinor, scale),
        adjustmentTotal: minorToMoney(adjustmentMinor, scale),
        totalDue: minorToMoney(itemMinor + adjustmentMinor, scale),
        totalDueMinor: itemMinor + adjustmentMinor,
      };
    });

  const allocatedTotalMinor = participantResults.reduce((_total, _participant) => _total + _participant.totalDueMinor, BIG_ZERO);
  const grandTotalMinor = itemsSubtotalMinor + adjustmentTotalMinor;

  return {
    currency,
    currencyScale: scale,
    itemsSubtotal: minorToMoney(itemsSubtotalMinor, scale),
    adjustmentTotal: minorToMoney(adjustmentTotalMinor, scale),
    grandTotal: minorToMoney(grandTotalMinor, scale),
    allocatedTotal: minorToMoney(allocatedTotalMinor, scale),
    unallocatedTotal: minorToMoney(grandTotalMinor - allocatedTotalMinor, scale),
    isFullyAllocated: calculatedItems.every(_item => _item.isFullyAllocated),
    items: calculatedItems.map(_item => ({
      uuid: _item.uuid,
      grossAmount: minorToMoney(_item.grossMinor, scale),
      discountAmount: minorToMoney(_item.discountMinor, scale),
      netAmount: minorToMoney(_item.netMinor, scale),
      allocatedQuantity: _item.allocatedQuantity,
      allocatedAmount: minorToMoney(_item.allocatedAmountMinor, scale),
      unallocatedAmount: minorToMoney(_item.netMinor - _item.allocatedAmountMinor, scale),
      isFullyAllocated: _item.isFullyAllocated,
      allocations: _item.allocationMinor.map(_allocation => ({
        participantUuid: _allocation.key,
        quantity: _item.input.allocations.find(_input => _input.participantUuid === _allocation.key)?.quantity ?? 0,
        amount: minorToMoney(_allocation.amount, scale),
      })),
    })),
    adjustments: calculatedAdjustments.map(_adjustment => ({
      uuid: _adjustment.input.uuid,
      baseAmount: minorToMoney(_adjustment.baseMinor, scale),
      amount: minorToMoney(_adjustment.amountMinor, scale),
      signedAmount: minorToMoney(_adjustment.signedMinor, scale),
    })),
    participants: participantResults.map(_participant => ({
      uuid: _participant.uuid,
      itemSubtotal: _participant.itemSubtotal,
      adjustmentTotal: _participant.adjustmentTotal,
      totalDue: _participant.totalDue,
    })),
  };
}
