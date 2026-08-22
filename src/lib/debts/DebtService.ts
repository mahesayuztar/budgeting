import 'server-only';

import { Prisma, type AccountType, type DebtStatus, type DebtType, type TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { NotFoundError, ValidationError } from '@/src/lib/Errors';
import { toAmount } from '@/src/helpers/MoneyHelper';
import { toDateOnly } from '@/src/helpers/DateHelper';
import { buildPage, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, type Page } from '@/src/helpers/PaginationHelper';
import type { DebtInput, DebtListParams, DebtPaymentInput, DebtPaymentUpdateInput } from './DebtValidator';

type DebtAccountDTO = {
  uuid: string;
  name: string;
  type: AccountType;
  color: string | null;
  bankName: string | null;
  accountNumber: string | null;
};

export type DebtPaymentDTO = {
  uuid: string;
  amount: number;
  paidAt: string;
  note: string | null;
  isOpeningBalance: boolean;
  account: DebtAccountDTO | null;
};

export type DebtDTO = {
  uuid: string;
  type: DebtType;
  party: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  note: string | null;
  dueDate: string | null;
  date: string | null;
  status: DebtStatus;
  account: DebtAccountDTO | null;
  payments: DebtPaymentDTO[];
};

const debtAccountSelect = {
  uuid: true,
  name: true,
  type: true,
  color: true,
  bankName: true,
  accountNumber: true,
} satisfies Prisma.AccountSelect;

const debtSelect = {
  uuid: true,
  type: true,
  party: true,
  amount: true,
  note: true,
  dueDate: true,
  date: true,
  status: true,
  transactions: {
    where: { debtPaymentId: null },
    select: { account: { select: debtAccountSelect } },
    orderBy: { id: 'asc' },
    take: 1,
  },
  payments: {
    select: {
      uuid: true,
      amount: true,
      paidAt: true,
      note: true,
      isOpeningBalance: true,
      transaction: { select: { account: { select: debtAccountSelect } } },
    },
    orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
  },
} satisfies Prisma.DebtSelect;

type DebtRow = Prisma.DebtGetPayload<{ select: typeof debtSelect }>;

const DEBT_CREATE_TRANSACTION_TYPE: Record<DebtType, TransactionType> = {
  PAYABLE: 'INCOME',
  RECEIVABLE: 'EXPENSE',
};

const DEBT_PAYMENT_TRANSACTION_TYPE: Record<DebtType, TransactionType> = {
  PAYABLE: 'EXPENSE',
  RECEIVABLE: 'INCOME',
};

const AUTO_CATEGORY_NAME: Record<TransactionType, string> = {
  EXPENSE: 'Tagihan',
  INCOME: 'Pemasukan Lain',
  TRANSFER: 'Transfer',
};

const DEBT_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

async function resolveAutoCategoryId(transaction: Prisma.TransactionClient, userId: number, type: TransactionType): Promise<number | null> {
  const category = await transaction.category.findFirst({
    where: { userId, type, name: AUTO_CATEGORY_NAME[type] },
    select: { id: true },
  });
  return category?.id ?? null;
}

async function resolveAccountId(transaction: Prisma.TransactionClient, userId: number, accountUuid: string): Promise<number> {
  const account = await transaction.account.findFirst({
    where: { uuid: accountUuid, userId, isActive: true },
    select: { id: true },
  });
  if (!account) throw new NotFoundError('Akun pembayaran tidak ditemukan atau sudah tidak aktif.');
  return account.id;
}

type AccountMovement = {
  accountId: number | null;
  type: TransactionType;
  amount: Prisma.Decimal;
  reverse?: boolean;
};

/** Menggabungkan lalu menerapkan mutasi saldo akun dari transaksi hutang. */
async function applyAccountMovements(transaction: Prisma.TransactionClient, movements: AccountMovement[]) {
  const totals = new Map<number, Prisma.Decimal>();

  for (const movement of movements) {
    if (!movement.accountId) continue;
    const direction = movement.type === 'INCOME' ? 1 : -1;
    const signedAmount = movement.amount.mul(movement.reverse ? -direction : direction);
    totals.set(movement.accountId, (totals.get(movement.accountId) ?? new Prisma.Decimal(0)).plus(signedAmount));
  }

  for (const accountId of [...totals.keys()].sort((_left, _right) => _left - _right)) {
    const delta = totals.get(accountId);
    if (!delta || delta.isZero()) continue;
    await transaction.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
  }
}

function buildAutoTransactionNote(type: DebtType, party: string, note?: string | null) {
  const label = type === 'PAYABLE' ? 'Berhutang ke' : 'Piutang dari';
  const trimmedNote = note?.trim();
  return trimmedNote ? `${label} ${party} - ${trimmedNote}` : `${label} ${party}`;
}

function decodeCursorId(cursor?: string): number | null {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 1) return null;
  const id = Number(parts[0]);
  return Number.isNaN(id) ? null : id;
}

function toDTO(row: DebtRow): DebtDTO {
  const amount = toAmount(row.amount);
  const paidAmount = row.payments.reduce((_total, _payment) => _total + toAmount(_payment.amount), 0);

  return {
    uuid: row.uuid,
    type: row.type,
    party: row.party,
    amount,
    paidAmount,
    remaining: Math.max(amount - paidAmount, 0),
    note: row.note,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    date: row.date ? row.date.toISOString().slice(0, 10) : null,
    status: row.status,
    account: row.transactions[0]?.account ?? null,
    payments: row.payments.map(_payment => ({
      uuid: _payment.uuid,
      amount: toAmount(_payment.amount),
      paidAt: _payment.paidAt.toISOString().slice(0, 10),
      note: _payment.note,
      isOpeningBalance: _payment.isOpeningBalance,
      account: _payment.transaction?.account ?? null,
    })),
  };
}

async function syncDebtStatus(transaction: Prisma.TransactionClient, debtId: number, debtAmount: Prisma.Decimal): Promise<DebtRow> {
  const totals = await transaction.debtPayment.aggregate({ where: { debtId }, _sum: { amount: true } });
  const isSettled = (totals._sum.amount ?? new Prisma.Decimal(0)).gte(debtAmount);

  return transaction.debt.update({
    where: { id: debtId },
    data: { status: isSettled ? 'PAID' : 'OPEN', settledAt: isSettled ? new Date() : null },
    select: debtSelect,
  });
}

function assertPaymentTotal(nextTotal: Prisma.Decimal, debtAmount: Prisma.Decimal, currentTotal?: Prisma.Decimal) {
  if (nextTotal.gt(debtAmount) && (!currentTotal || nextTotal.gt(currentTotal))) {
    throw new ValidationError({ amount: ['Total pembayaran tidak boleh melebihi nilai hutang/piutang.'] });
  }
}

class DebtService {
  async list(userId: number, params: DebtListParams = {}): Promise<Page<DebtDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const cursorId = decodeCursorId(params.cursor);
    const rows = await prisma.debt.findMany({
      where: {
        userId,
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.q ? { OR: [{ party: { contains: params.q, mode: 'insensitive' } }, { note: { contains: params.q, mode: 'insensitive' } }] } : {}),
        ...(cursorId === null ? {} : { id: { lt: cursorId } }),
      },
      select: { ...debtSelect, id: true },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    return buildPage(rows, limit, toDTO, _row => encodeCursor([_row.id]));
  }

  async create(userId: number, input: DebtInput): Promise<DebtDTO> {
    const amount = new Prisma.Decimal(input.amount);
    const initialPaidAmount = new Prisma.Decimal(input.initialPaidAmount);
    const transactionType = DEBT_CREATE_TRANSACTION_TYPE[input.type];

    const row = await prisma.$transaction(async transaction => {
      const accountId = await resolveAccountId(transaction, userId, input.accountUuid);
      const debt = await transaction.debt.create({
        data: {
          userId,
          type: input.type,
          party: input.party,
          amount,
          note: input.note?.trim() || null,
          date: toDateOnly(input.date),
          dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
        },
        select: { id: true },
      });

      if (initialPaidAmount.gt(0)) {
        await transaction.debtPayment.create({
          data: {
            debtId: debt.id,
            amount: initialPaidAmount,
            paidAt: toDateOnly(input.date),
            note: 'Saldo awal pembayaran',
            isOpeningBalance: true,
          },
        });
      }

      const categoryId = await resolveAutoCategoryId(transaction, userId, transactionType);
      await transaction.transaction.create({
        data: {
          userId,
          categoryId,
          debtId: debt.id,
          accountId,
          type: transactionType,
          amount,
          note: buildAutoTransactionNote(input.type, input.party, input.note),
          occurredAt: toDateOnly(input.date),
        },
      });
      await applyAccountMovements(transaction, [{ accountId, type: transactionType, amount }]);
      return syncDebtStatus(transaction, debt.id, amount);
    }, DEBT_TRANSACTION_OPTIONS);
    return toDTO(row);
  }

  async addPayment(userId: number, uuid: string, input: DebtPaymentInput): Promise<DebtDTO> {
    const debt = await this.mustOwn(userId, uuid);
    const amount = new Prisma.Decimal(input.amount);
    const transactionType = DEBT_PAYMENT_TRANSACTION_TYPE[debt.type];

    const row = await prisma.$transaction(async transaction => {
      const totals = await transaction.debtPayment.aggregate({ where: { debtId: debt.id }, _sum: { amount: true } });
      assertPaymentTotal((totals._sum.amount ?? new Prisma.Decimal(0)).plus(amount), debt.amount);
      const accountId = await resolveAccountId(transaction, userId, input.accountUuid);
      const payment = await transaction.debtPayment.create({
        data: { debtId: debt.id, amount, paidAt: toDateOnly(input.paidAt), note: input.note?.trim() || null },
        select: { id: true },
      });
      const categoryId = await resolveAutoCategoryId(transaction, userId, transactionType);

      await transaction.transaction.create({
        data: {
          userId,
          categoryId,
          debtId: debt.id,
          debtPaymentId: payment.id,
          accountId,
          type: transactionType,
          amount,
          note: input.note?.trim() || null,
          occurredAt: toDateOnly(input.paidAt),
        },
      });
      await applyAccountMovements(transaction, [{ accountId, type: transactionType, amount }]);
      return syncDebtStatus(transaction, debt.id, debt.amount);
    }, DEBT_TRANSACTION_OPTIONS);
    return toDTO(row);
  }

  async updatePayment(userId: number, debtUuid: string, paymentUuid: string, input: DebtPaymentUpdateInput): Promise<DebtDTO> {
    const payment = await this.mustOwnPayment(userId, debtUuid, paymentUuid);
    const amount = new Prisma.Decimal(input.amount);
    const transactionType = DEBT_PAYMENT_TRANSACTION_TYPE[payment.debt.type];

    const row = await prisma.$transaction(async transaction => {
      const totals = await transaction.debtPayment.aggregate({ where: { debtId: payment.debt.id }, _sum: { amount: true } });
      const currentTotal = totals._sum.amount ?? new Prisma.Decimal(0);
      assertPaymentTotal(currentTotal.minus(payment.amount).plus(amount), payment.debt.amount, currentTotal);

      await transaction.debtPayment.update({
        where: { id: payment.id },
        data: { amount, paidAt: toDateOnly(input.paidAt), note: input.note?.trim() || null },
      });

      if (!payment.isOpeningBalance) {
        if (!input.accountUuid) throw new ValidationError({ accountUuid: ['Akun pembayaran wajib dipilih.'] });
        const accountId = await resolveAccountId(transaction, userId, input.accountUuid);
        const categoryId = await resolveAutoCategoryId(transaction, userId, transactionType);

        if (payment.transaction) {
          await transaction.transaction.update({
            where: { id: payment.transaction.id },
            data: { categoryId, accountId, type: transactionType, amount, note: input.note?.trim() || null, occurredAt: toDateOnly(input.paidAt) },
          });
          await applyAccountMovements(transaction, [
            { accountId: payment.transaction.accountId, type: payment.transaction.type, amount: payment.transaction.amount, reverse: true },
            { accountId, type: transactionType, amount },
          ]);
        } else {
          await transaction.transaction.create({
            data: {
              userId,
              categoryId,
              debtId: payment.debt.id,
              debtPaymentId: payment.id,
              accountId,
              type: transactionType,
              amount,
              note: input.note?.trim() || null,
              occurredAt: toDateOnly(input.paidAt),
            },
          });
          await applyAccountMovements(transaction, [{ accountId, type: transactionType, amount }]);
        }
      }

      return syncDebtStatus(transaction, payment.debt.id, payment.debt.amount);
    }, DEBT_TRANSACTION_OPTIONS);
    return toDTO(row);
  }

  async removePayment(userId: number, debtUuid: string, paymentUuid: string): Promise<DebtDTO> {
    const payment = await this.mustOwnPayment(userId, debtUuid, paymentUuid);

    const row = await prisma.$transaction(async transaction => {
      if (payment.transaction) {
        await applyAccountMovements(transaction, [{ accountId: payment.transaction.accountId, type: payment.transaction.type, amount: payment.transaction.amount, reverse: true }]);
      }
      await transaction.debtPayment.delete({ where: { id: payment.id } });
      return syncDebtStatus(transaction, payment.debt.id, payment.debt.amount);
    }, DEBT_TRANSACTION_OPTIONS);
    return toDTO(row);
  }

  async remove(userId: number, uuid: string): Promise<void> {
    const debt = await this.mustOwn(userId, uuid);

    await prisma.$transaction(async transaction => {
      const rows = await transaction.transaction.findMany({ where: { debtId: debt.id }, select: { accountId: true, type: true, amount: true } });
      await applyAccountMovements(
        transaction,
        rows.map(_row => ({ ..._row, reverse: true })),
      );
      await transaction.debt.delete({ where: { id: debt.id } });
    }, DEBT_TRANSACTION_OPTIONS);
  }

  private async mustOwn(userId: number, uuid: string) {
    const debt = await prisma.debt.findFirst({ where: { uuid, userId }, select: { id: true, amount: true, type: true } });
    if (!debt) throw new NotFoundError('Data hutang/piutang tidak ditemukan.');
    return debt;
  }

  private async mustOwnPayment(userId: number, debtUuid: string, paymentUuid: string) {
    const payment = await prisma.debtPayment.findFirst({
      where: { uuid: paymentUuid, debt: { uuid: debtUuid, userId } },
      select: {
        id: true,
        amount: true,
        isOpeningBalance: true,
        debt: { select: { id: true, amount: true, type: true } },
        transaction: { select: { id: true, accountId: true, type: true, amount: true } },
      },
    });
    if (!payment) throw new NotFoundError('Riwayat pembayaran tidak ditemukan.');
    return payment;
  }
}

export const debtService = new DebtService();
