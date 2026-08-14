import "server-only";

import { Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { NotFoundError } from "@/src/core/lib/errors";
import { toAmount } from "@/src/core/lib/money";
import { monthRange, toDateOnly, yearRange } from "@/src/core/lib/date";
import type {
  TransactionInput,
  TransactionListParams,
} from "../validators/transaction.validator";

export type TransactionDTO = {
  uuid: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  occurredAt: string;
  category: { uuid: string; name: string; icon: string | null; color: string | null } | null;
};

const select = {
  uuid: true,
  type: true,
  amount: true,
  note: true,
  occurredAt: true,
  category: { select: { uuid: true, name: true, icon: true, color: true } },
} satisfies Prisma.TransactionSelect;

type TransactionRow = Prisma.TransactionGetPayload<{ select: typeof select }>;

/** Decimal dan Date tidak boleh menyeberang ke Client Component apa adanya. */
function toDTO(row: TransactionRow): TransactionDTO {
  return {
    uuid: row.uuid,
    type: row.type,
    amount: toAmount(row.amount),
    note: row.note,
    occurredAt: row.occurredAt.toISOString().slice(0, 10),
    category: row.category,
  };
}

class TransactionService {
  async list(
    userId: number,
    params: TransactionListParams = {},
  ): Promise<TransactionDTO[]> {
    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        ...buildPeriodFilter(params),
        ...(params.type ? { type: params.type } : {}),
      },
      select,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: params.limit ?? 100,
    });

    return rows.map(toDTO);
  }

  async create(userId: number, input: TransactionInput): Promise<TransactionDTO> {
    const categoryId = await resolveCategoryId(userId, input.categoryUuid);

    const row = await prisma.transaction.create({
      data: {
        userId,
        categoryId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        occurredAt: toDateOnly(input.occurredAt),
      },
      select,
    });

    return toDTO(row);
  }

  async update(
    userId: number,
    uuid: string,
    input: TransactionInput,
  ): Promise<TransactionDTO> {
    await this.mustOwn(userId, uuid);
    const categoryId = await resolveCategoryId(userId, input.categoryUuid);

    const row = await prisma.transaction.update({
      where: { uuid },
      data: {
        categoryId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        occurredAt: toDateOnly(input.occurredAt),
      },
      select,
    });

    return toDTO(row);
  }

  async remove(userId: number, uuid: string): Promise<void> {
    await this.mustOwn(userId, uuid);
    await prisma.transaction.delete({ where: { uuid } });
  }

  /** `userId` selalu ikut di filter supaya uuid orang lain tidak bisa disentuh. */
  private async mustOwn(userId: number, uuid: string) {
    const found = await prisma.transaction.findFirst({
      where: { uuid, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundError("Transaksi tidak ditemukan.");
    return found;
  }
}

function buildPeriodFilter(params: TransactionListParams) {
  if (!params.year) return {};

  const { start, end } = params.month
    ? monthRange(params.year, params.month)
    : yearRange(params.year);

  return { occurredAt: { gte: start, lt: end } };
}

async function resolveCategoryId(userId: number, categoryUuid?: string | null) {
  if (!categoryUuid) return null;

  const category = await prisma.category.findFirst({
    where: { uuid: categoryUuid, userId },
    select: { id: true },
  });

  if (!category) throw new NotFoundError("Kategori tidak ditemukan.");
  return category.id;
}

export const transactionService = new TransactionService();
