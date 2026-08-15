import 'server-only';

import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { ConflictError, NotFoundError } from '@/src/lib/Errors';
import type { CategoryInput } from './CategoryValidator';

export type CategoryDTO = {
  uuid: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
};

export type CategoryUsageDTO = CategoryDTO & { transactionCount: number };

/**
 * Kategori bawaan yang disemai saat pengguna mendaftar, supaya aplikasi
 * langsung dapat dipakai mencatat tanpa menyiapkan kategori satu per satu.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<Pick<CategoryDTO, 'name' | 'type' | 'icon' | 'color'>> = [
  { name: 'Gaji', type: 'INCOME', icon: 'ph:wallet', color: '#7BC67B' },
  { name: 'Bonus', type: 'INCOME', icon: 'ph:gift', color: '#8FD3C1' },
  { name: 'Pemasukan Lain', type: 'INCOME', icon: 'ph:plus-circle', color: '#A3C7E8' },
  { name: 'Makan & Minum', type: 'EXPENSE', icon: 'ph:fork-knife', color: '#FFBE91' },
  { name: 'Transport', type: 'EXPENSE', icon: 'ph:bus', color: '#FFD59E' },
  { name: 'Belanja', type: 'EXPENSE', icon: 'ph:shopping-bag', color: '#F5A9A9' },
  { name: 'Tagihan', type: 'EXPENSE', icon: 'ph:receipt', color: '#C9B6E4' },
  { name: 'Hiburan', type: 'EXPENSE', icon: 'ph:game-controller', color: '#9AD0EC' },
  { name: 'Pengeluaran Lain', type: 'EXPENSE', icon: 'ph:dots-three-circle', color: '#D0D0D0' },
];

const categorySelect = {
  uuid: true,
  name: true,
  type: true,
  icon: true,
  color: true,
} satisfies Prisma.CategorySelect;

/**
 * Menerjemahkan pelanggaran unique constraint Prisma menjadi ConflictError yang
 * pesannya dapat dibaca pengguna. Error jenis lain diteruskan apa adanya.
 * @param {unknown} error - Error yang tertangkap dari operasi Prisma.
 * @returns {unknown} ConflictError bila kategori bentrok, selain itu error aslinya.
 */
function toCategoryError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictError('Kategori dengan nama dan tipe ini sudah ada.');
  }

  return error;
}

/**
 * Operasi baca dan tulis kategori pengguna. Seluruh method menerima `userId`
 * sebagai penyaring wajib supaya kategori antar pengguna tidak pernah saling
 * bocor.
 */
class CategoryService {
  /**
   * Mengambil daftar kategori milik seorang pengguna, terurut per tipe lalu
   * berdasarkan nama.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @param {TransactionType} type - Batasi ke satu tipe kategori saja, opsional.
   * @returns {Promise<CategoryDTO[]>} Daftar kategori milik pengguna.
   */
  async list(userId: number, type?: TransactionType): Promise<CategoryDTO[]> {
    return prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      select: categorySelect,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Mengambil seluruh kategori milik pengguna beserta jumlah transaksi yang
   * memakainya. Halaman pengaturan menampilkan angka ini supaya pengguna tahu
   * seberapa besar dampak menghapus sebuah kategori.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @returns {Promise<CategoryUsageDTO[]>} Daftar kategori beserta jumlah transaksinya.
   */
  async listWithUsage(userId: number): Promise<CategoryUsageDTO[]> {
    const rows = await prisma.category.findMany({
      where: { userId },
      select: { ...categorySelect, _count: { select: { transactions: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return rows.map(({ _count, ..._category }) => ({
      ..._category,
      transactionCount: _count.transactions,
    }));
  }

  /**
   * Membuat kategori baru milik pengguna.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @param {CategoryInput} input - Data kategori yang sudah tervalidasi.
   * @param {string} input.name - Nama kategori.
   * @param {TransactionType} input.type - Tipe kategori, INCOME atau EXPENSE.
   * @returns {Promise<CategoryDTO>} Kategori yang baru dibuat.
   * @throws {ConflictError} Jika kombinasi nama dan tipe sudah dipakai pengguna tersebut.
   */
  async create(userId: number, input: CategoryInput): Promise<CategoryDTO> {
    try {
      return await prisma.category.create({
        data: { userId, ...input },
        select: categorySelect,
      });
    } catch (error) {
      throw toCategoryError(error);
    }
  }

  /**
   * Memperbarui kategori milik pengguna.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @param {string} uuid - UUID kategori yang diperbarui.
   * @param {CategoryInput} input - Data kategori yang sudah tervalidasi.
   * @param {string} input.name - Nama kategori.
   * @param {TransactionType} input.type - Tipe kategori, INCOME atau EXPENSE.
   * @returns {Promise<CategoryDTO>} Kategori setelah diperbarui.
   * @throws {NotFoundError} Jika kategori tidak ada atau bukan milik pengguna tersebut.
   * @throws {ConflictError} Jika kombinasi nama dan tipe sudah dipakai pengguna tersebut.
   */
  async update(userId: number, uuid: string, input: CategoryInput): Promise<CategoryDTO> {
    const category = await this.mustOwn(userId, uuid);

    try {
      return await prisma.category.update({
        where: { id: category.id },
        data: input,
        select: categorySelect,
      });
    } catch (error) {
      throw toCategoryError(error);
    }
  }

  /**
   * Menghapus kategori milik pengguna. Transaksi lama tidak ikut terhapus
   * karena relasinya memakai `SetNull`, sehingga riwayat tetap utuh dan hanya
   * kehilangan label kategorinya.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @param {string} uuid - UUID kategori yang dihapus.
   * @returns {Promise<void>} Selesai setelah kategori terhapus.
   * @throws {NotFoundError} Jika kategori tidak ada atau bukan milik pengguna tersebut.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    const category = await this.mustOwn(userId, uuid);
    await prisma.category.delete({ where: { id: category.id } });
  }

  /**
   * Menyemai kategori bawaan untuk pengguna yang baru mendaftar. Dijalankan di
   * dalam transaksi pendaftaran supaya kategori bawaan dan pengguna selalu
   * tercipta bersama-sama.
   * @param {Prisma.TransactionClient} transaction - Client Prisma milik transaksi pendaftaran.
   * @param {number} userId - ID pengguna yang baru dibuat.
   * @returns {Promise<Prisma.BatchPayload>} Ringkasan jumlah kategori yang tercipta.
   */
  seedDefaults(transaction: Prisma.TransactionClient, userId: number) {
    return transaction.category.createMany({
      data: DEFAULT_CATEGORIES.map(_category => ({ ..._category, userId })),
    });
  }

  /**
   * Memastikan sebuah kategori benar-benar milik pengguna sebelum diubah.
   * @param {number} userId - ID pengguna pemilik kategori.
   * @param {string} uuid - UUID kategori yang diperiksa.
   * @returns {Promise<{ id: number }>} ID internal kategori.
   * @throws {NotFoundError} Jika kategori tidak ada atau bukan milik pengguna tersebut.
   */
  private async mustOwn(userId: number, uuid: string) {
    const category = await prisma.category.findFirst({
      where: { uuid, userId },
      select: { id: true },
    });

    if (!category) throw new NotFoundError('Kategori tidak ditemukan.');

    return category;
  }
}

export const categoryService = new CategoryService();
