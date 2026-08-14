import "server-only";

import {
  Prisma,
  type DebtStatus,
  type DebtType,
  type TransactionType,
} from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { NotFoundError } from "@/src/core/lib/errors";
import { toAmount } from "@/src/core/lib/money";
import { toDateOnly } from "@/src/core/lib/date";
import {
  buildPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  type Page,
} from "@/src/core/lib/pagination";
import type {
  DebtInput,
  DebtListParams,
  DebtPaymentInput,
} from "../validators/debt.validator";

export type DebtPaymentDTO = {
  uuid: string;
  amount: number;
  paidAt: string;
  note: string | null;
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
  payments: DebtPaymentDTO[];
};

const select = {
  uuid: true,
  type: true,
  party: true,
  amount: true,
  note: true,
  dueDate: true,
  date: true,
  status: true,
  payments: {
    select: { uuid: true, amount: true, paidAt: true, note: true },
    orderBy: { paidAt: "desc" },
  },
} satisfies Prisma.DebtSelect;

/**
 * Hutang (PAYABLE) berarti uang keluar, piutang (RECEIVABLE) berarti uang
 * masuk — dipakai baik saat hutang/piutang dibuat maupun saat dibayar.
 */
const DEBT_TRANSACTION_TYPE: Record<DebtType, TransactionType> = {
  PAYABLE: "EXPENSE",
  RECEIVABLE: "INCOME",
};

/** Kategori bawaan yang sudah ada di `DEFAULT_CATEGORIES`, dipakai apa adanya
 *  supaya tidak menambah kategori baru khusus hutang/piutang. */
const AUTO_CATEGORY_NAME: Record<TransactionType, string> = {
  EXPENSE: "Tagihan",
  INCOME: "Pemasukan Lain",
};

async function resolveAutoCategoryId(
  tx: Prisma.TransactionClient,
  userId: number,
  type: TransactionType,
): Promise<number | null> {
  const category = await tx.category.findFirst({
    where: { userId, type, name: AUTO_CATEGORY_NAME[type] },
    select: { id: true },
  });
  return category?.id ?? null;
}

function autoTransactionNote(
  type: DebtType,
  party: string,
  note?: string | null,
) {
  const label = type === "PAYABLE" ? "Berhutang ke" : "Piutang dari";
  const trimmed = note?.trim();
  return trimmed ? `${label} ${party} - ${trimmed}` : `${label} ${party}`;
}

type DebtRow = Prisma.DebtGetPayload<{ select: typeof select }>;

function toDTO(row: DebtRow): DebtDTO {
  const amount = toAmount(row.amount);
  const paidAmount = row.payments.reduce(
    (total, payment) => total + toAmount(payment.amount),
    0,
  );

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
    payments: row.payments.map((payment) => ({
      uuid: payment.uuid,
      amount: toAmount(payment.amount),
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      note: payment.note,
    })),
  };
}

class DebtService {
  async list(
    userId: number,
    params: DebtListParams = {},
  ): Promise<Page<DebtDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const cursorId = decodeCursorId(params.cursor);

    const rows = await prisma.debt.findMany({
      where: {
        userId,
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.q
          ? {
              OR: [
                { party: { contains: params.q, mode: "insensitive" } },
                { note: { contains: params.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(cursorId === null ? {} : { id: { lt: cursorId } }),
      },
      select: { ...select, id: true },
      // Diurutkan murni `id desc` supaya cursor cukup satu kolom. Mengurutkan
      // per status/jatuh tempo akan membuat keyset butuh perbandingan majemuk.
      orderBy: { id: "desc" },
      take: limit + 1,
    });

    return buildPage(rows, limit, toDTO, (row) => encodeCursor([row.id]));
  }

  /**
   * Hutang/piutang baru langsung tercatat sebagai transaksi juga: hutang
   * dianggap uang keluar, piutang uang masuk — atomik dengan pembuatan datanya.
   */
  async create(userId: number, input: DebtInput): Promise<DebtDTO> {
    const transactionType = DEBT_TRANSACTION_TYPE[input.type];

    const row = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          type: input.type,
          party: input.party,
          amount: new Prisma.Decimal(input.amount),
          note: input.note?.trim() || null,
          date: toDateOnly(input.date),
          dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
        },
        select,
      });

      const categoryId = await resolveAutoCategoryId(
        tx,
        userId,
        transactionType,
      );

      await tx.transaction.create({
        data: {
          userId,
          categoryId,
          type: transactionType,
          amount: new Prisma.Decimal(input.amount),
          note: autoTransactionNote(input.type, input.party, input.note),
          occurredAt: toDateOnly(input.date),
        },
      });

      return debt;
    });

    return toDTO(row);
  }

  /**
   * Pembayaran, transaksi otomatis, dan perubahan status harus atomik: kalau
   * tidak, dua pembayaran bersamaan bisa membuat hutang lunas tapi status
   * tetap OPEN, atau transaksinya tercatat tanpa pembayarannya.
   */
  async addPayment(
    userId: number,
    uuid: string,
    input: DebtPaymentInput,
  ): Promise<DebtDTO> {
    const debt = await this.mustOwn(userId, uuid);
    const transactionType = DEBT_TRANSACTION_TYPE[debt.type];

    const row = await prisma.$transaction(async (tx) => {
      await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          amount: new Prisma.Decimal(input.amount),
          paidAt: toDateOnly(input.paidAt),
          note: input.note?.trim() || null,
        },
      });

      const categoryId = await resolveAutoCategoryId(
        tx,
        userId,
        transactionType,
      );

      await tx.transaction.create({
        data: {
          userId,
          categoryId,
          type: transactionType,
          amount: new Prisma.Decimal(input.amount),
          note: input.note?.trim() || null,
          occurredAt: toDateOnly(input.paidAt),
        },
      });

      const totals = await tx.debtPayment.aggregate({
        where: { debtId: debt.id },
        _sum: { amount: true },
      });

      const paid = toAmount(totals._sum.amount);
      const settled = paid >= toAmount(debt.amount);

      return tx.debt.update({
        where: { id: debt.id },
        data: {
          status: settled ? "PAID" : "OPEN",
          settledAt: settled ? new Date() : null,
        },
        select,
      });
    });

    return toDTO(row);
  }

  async remove(userId: number, uuid: string): Promise<void> {
    const debt = await this.mustOwn(userId, uuid);
    await prisma.debt.delete({ where: { id: debt.id } });
  }

  private async mustOwn(userId: number, uuid: string) {
    const debt = await prisma.debt.findFirst({
      where: { uuid, userId },
      select: { id: true, amount: true, type: true },
    });
    if (!debt) throw new NotFoundError("Data hutang/piutang tidak ditemukan.");
    return debt;
  }
}

function decodeCursorId(cursor?: string): number | null {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 1) return null;

  const id = Number(parts[0]);
  return Number.isNaN(id) ? null : id;
}

export const debtService = new DebtService();
