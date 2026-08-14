import "server-only";

import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { ConflictError } from "@/src/core/lib/errors";
import type { CategoryInput } from "../validators/category.validator";

export type CategoryDTO = {
  uuid: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
};

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

  async create(userId: number, input: CategoryInput): Promise<CategoryDTO> {
    try {
      return await prisma.category.create({
        data: { userId, ...input },
        select,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("Kategori dengan nama dan tipe ini sudah ada.");
      }
      throw error;
    }
  }

  /** Dipanggil di dalam transaksi register. */
  seedDefaults(tx: Prisma.TransactionClient, userId: number) {
    return tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
    });
  }
}

export const categoryService = new CategoryService();
