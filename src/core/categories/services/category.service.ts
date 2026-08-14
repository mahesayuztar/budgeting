import "server-only";

import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { ConflictError, NotFoundError } from "@/src/core/lib/errors";
import type { CategoryInput } from "../validators/category.validator";

export type CategoryDTO = {
  uuid: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
};

/** Dipakai halaman pengaturan: jumlah transaksi menentukan seberapa berat
    dampak menghapus kategori, jadi ikut ditampilkan sebelum dihapus. */
export type CategoryUsageDTO = CategoryDTO & { transactionCount: number };

/** Diseed saat register supaya aplikasi langsung bisa dipakai. */
export const DEFAULT_CATEGORIES: ReadonlyArray<
  Pick<CategoryDTO, "name" | "type" | "icon" | "color">
> = [
  { name: "Gaji", type: "INCOME", icon: "ph:wallet", color: "#7BC67B" },
  { name: "Bonus", type: "INCOME", icon: "ph:gift", color: "#8FD3C1" },
  { name: "Pemasukan Lain", type: "INCOME", icon: "ph:plus-circle", color: "#A3C7E8" },
  { name: "Makan & Minum", type: "EXPENSE", icon: "ph:fork-knife", color: "#FFBE91" },
  { name: "Transport", type: "EXPENSE", icon: "ph:bus", color: "#FFD59E" },
  { name: "Belanja", type: "EXPENSE", icon: "ph:shopping-bag", color: "#F5A9A9" },
  { name: "Tagihan", type: "EXPENSE", icon: "ph:receipt", color: "#C9B6E4" },
  { name: "Hiburan", type: "EXPENSE", icon: "ph:game-controller", color: "#9AD0EC" },
  { name: "Pengeluaran Lain", type: "EXPENSE", icon: "ph:dots-three-circle", color: "#D0D0D0" },
];

const select = {
  uuid: true,
  name: true,
  type: true,
  icon: true,
  color: true,
} satisfies Prisma.CategorySelect;

class CategoryService {
  async list(userId: number, type?: TransactionType): Promise<CategoryDTO[]> {
    return prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      select,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async listWithUsage(userId: number): Promise<CategoryUsageDTO[]> {
    const rows = await prisma.category.findMany({
      where: { userId },
      select: { ...select, _count: { select: { transactions: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return rows.map(({ _count, ...category }) => ({
      ...category,
      transactionCount: _count.transactions,
    }));
  }

  async create(userId: number, input: CategoryInput): Promise<CategoryDTO> {
    try {
      return await prisma.category.create({
        data: { userId, ...input },
        select,
      });
    } catch (error) {
      throw toCategoryError(error);
    }
  }

  async update(
    userId: number,
    uuid: string,
    input: CategoryInput,
  ): Promise<CategoryDTO> {
    const category = await this.mustOwn(userId, uuid);

    try {
      return await prisma.category.update({
        where: { id: category.id },
        data: input,
        select,
      });
    } catch (error) {
      throw toCategoryError(error);
    }
  }

  /**
   * Transaksi lama tidak ikut terhapus: relasinya `SetNull`, jadi riwayat tetap
   * utuh dan hanya kehilangan label kategorinya.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    const category = await this.mustOwn(userId, uuid);
    await prisma.category.delete({ where: { id: category.id } });
  }

  private async mustOwn(userId: number, uuid: string) {
    const category = await prisma.category.findFirst({
      where: { uuid, userId },
      select: { id: true },
    });
    if (!category) throw new NotFoundError("Kategori tidak ditemukan.");
    return category;
  }

  /** Dipanggil di dalam transaksi register. */
  seedDefaults(tx: Prisma.TransactionClient, userId: number) {
    return tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
    });
  }
}

function toCategoryError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new ConflictError("Kategori dengan nama dan tipe ini sudah ada.");
  }
  return error;
}

export const categoryService = new CategoryService();
