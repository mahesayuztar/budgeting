import "server-only";

import { Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { NotFoundError } from "@/src/core/lib/errors";
import { toAmount } from "@/src/core/lib/money";
import { monthRange, toDateOnly, yearRange } from "@/src/core/lib/date";
import {
  buildPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  type Page,
} from "@/src/core/lib/pagination";
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
  ): Promise<Page<TransactionDTO>> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;

    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        ...(params.type ? { type: params.type } : {}),
        AND: [
          buildPeriodFilter(params),
          buildSearchFilter(params.q),
          buildCursorFilter(params.cursor),
        ],
      },
      // `id` hanya dipakai membentuk cursor, tidak ikut ke DTO.
      select: { ...select, id: true },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    return buildPage(
      rows,
      limit,
      toDTO,
      (row) => encodeCursor([row.occurredAt.toISOString().slice(0, 10), row.id]),
    );
  }

  /**
   * Laporan PDF butuh seluruh transaksi periode, bukan satu halaman.
   * Sengaja dipisah agar batas paginasi tidak diam-diam memotong laporan.
   */
  async listAllInPeriod(
    userId: number,
    year: number,
    month?: number,
  ): Promise<TransactionDTO[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, ...buildPeriodFilter({ year, month }) },
      select,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });

    return rows.map(toDTO);
  }

  async create(userId: number, input: TransactionInput): Promise<TransactionDTO> {
    const categoryId = await resolveCategoryId(userId, input.categoryUuid);
    const accountId = await resolveAccountId(userId, input.accountUuid);

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

function buildPeriodFilter(
  params: TransactionListParams,
): Prisma.TransactionWhereInput {
  if (!params.year) return {};

  const { start, end } = params.month
    ? monthRange(params.year, params.month)
    : yearRange(params.year);

  return { occurredAt: { gte: start, lt: end } };
}

/** Cocokkan pada catatan maupun nama kategori, tanpa peduli huruf besar/kecil. */
function buildSearchFilter(q?: string): Prisma.TransactionWhereInput {
  if (!q) return {};

  return {
    OR: [
      { note: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ],
  };
}

/**
 * Urutannya (occurredAt desc, id desc), jadi cursor harus membandingkan
 * keduanya — memakai tanggal saja akan melewatkan transaksi lain di hari yang sama.
 */
function buildCursorFilter(cursor?: string): Prisma.TransactionWhereInput {
  const parts = decodeCursor(cursor);
  if (!parts || parts.length !== 2) return {};

  const [date, rawId] = parts;
  const occurredAt = toDateOnly(date);
  const id = Number(rawId);
  if (Number.isNaN(id)) return {};

  return {
    OR: [{ occurredAt: { lt: occurredAt } }, { occurredAt, id: { lt: id } }],
  };
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

async function resolveAccountId(userId: number, accountUuid?: string | null) {
  if (!accountUuid) return null;

  const account = await prisma.account.findFirst({
    where: { uuid: accountUuid, userId },
    select: { id: true },
  });

  if (!account) throw new NotFoundError("Akun tidak ditemukan.");
  return account.id;
}

export const transactionService = new TransactionService();
