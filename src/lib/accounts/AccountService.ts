import 'server-only';

import { AccountType, Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { ConflictError, NotFoundError } from '@/src/lib/Errors';
import type { AccountInput } from './AccountValidator';
import { DEFAULT_ACCOUNTS } from './AccountConstants';

export type AccountDTO = {
  uuid: string;
  name: string;
  type: AccountType;
  color: string | null;
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: string;
  balance: string;
  isActive: boolean;
};

export type AccountUsageDTO = AccountDTO & {
  transactionCount: number;
};

const accountSelect = {
  uuid: true,
  name: true,
  type: true,
  color: true,
  bankName: true,
  accountNumber: true,
  openingBalance: true,
  balance: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

type AccountRow = Prisma.AccountGetPayload<{
  select: typeof accountSelect;
}>;

/**
 * Mengubah baris akun dari database menjadi DTO. Kolom uang dijadikan string
 * karena `Prisma.Decimal` tidak dapat melewati batas Server ke Client Component.
 * @param {AccountRow} account - Baris akun hasil kueri Prisma.
 * @returns {AccountDTO} Akun dalam bentuk yang aman dikirim ke klien.
 */
function toDTO(account: AccountRow): AccountDTO {
  return {
    ...account,
    openingBalance: account.openingBalance.toString(),
    balance: account.balance.toString(),
  };
}

/**
 * Menerjemahkan pelanggaran unique constraint Prisma menjadi ConflictError yang
 * pesannya dapat dibaca pengguna. Error jenis lain diteruskan apa adanya.
 * @param {unknown} error - Error yang tertangkap dari operasi Prisma.
 * @returns {unknown} ConflictError bila nama akun bentrok, selain itu error aslinya.
 */
function toAccountError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictError('Akun dengan nama ini sudah ada.');
  }

  return error;
}

/**
 * Operasi baca dan tulis akun pengguna. Seluruh method menerima `userId`
 * sebagai penyaring wajib supaya data akun antar pengguna tidak pernah
 * saling bocor.
 */
class AccountService {
  /**
   * Mengambil daftar akun milik seorang pengguna, terurut dengan akun aktif di
   * bagian atas lalu berdasarkan nama.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {AccountType} type - Batasi ke satu jenis akun saja, opsional.
   * @param {boolean} includeInactive - Sertakan akun nonaktif bila true, default false.
   * @returns {Promise<AccountDTO[]>} Daftar akun milik pengguna.
   */
  async list(userId: number, type?: AccountType, includeInactive = false): Promise<AccountDTO[]> {
    const rows = await prisma.account.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(!includeInactive ? { isActive: true } : {}),
      },
      select: accountSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map(toDTO);
  }

  /**
   * Mengambil seluruh akun milik pengguna beserta jumlah transaksi yang
   * memakainya, dipakai halaman pengaturan untuk menandai akun yang masih
   * terpakai sebelum dinonaktifkan.
   * @param {number} userId - ID pengguna pemilik akun.
   * @returns {Promise<AccountUsageDTO[]>} Daftar akun beserta jumlah transaksinya.
   */
  async listWithUsage(userId: number): Promise<AccountUsageDTO[]> {
    const rows = await prisma.account.findMany({
      where: { userId },
      select: {
        ...accountSelect,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map(({ _count, ..._account }) => ({
      ...toDTO(_account),
      transactionCount: _count.transactions,
    }));
  }

  /**
   * Mengambil satu akun milik pengguna berdasarkan uuid.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {string} uuid - UUID akun yang dicari.
   * @returns {Promise<AccountDTO>} Akun yang ditemukan.
   * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
   */
  async get(userId: number, uuid: string): Promise<AccountDTO> {
    const account = await prisma.account.findFirst({
      where: { uuid, userId },
      select: accountSelect,
    });

    if (!account) {
      throw new NotFoundError('Akun tidak ditemukan.');
    }

    return toDTO(account);
  }

  /**
   * Membuat akun baru. Saldo berjalan disamakan dengan saldo awal, dan detail
   * bank hanya disimpan untuk akun bertipe BANK.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {AccountInput} input - Data akun yang sudah tervalidasi.
   * @param {string} input.name - Nama akun.
   * @param {AccountType} input.type - Jenis akun, CASH atau BANK.
   * @param {string} input.openingBalance - Saldo awal akun.
   * @returns {Promise<AccountDTO>} Akun yang baru dibuat.
   * @throws {ConflictError} Jika nama akun sudah dipakai pengguna tersebut.
   */
  async create(userId: number, input: AccountInput): Promise<AccountDTO> {
    const openingBalance = new Prisma.Decimal(input.openingBalance);

    try {
      const account = await prisma.account.create({
        data: {
          userId,
          name: input.name,
          type: input.type,
          color: input.color,
          bankName: input.type === 'BANK' ? input.bankName : null,
          accountNumber: input.type === 'BANK' ? input.accountNumber : null,
          openingBalance,
          balance: openingBalance,
        },
        select: accountSelect,
      });

      return toDTO(account);
    } catch (error) {
      throw toAccountError(error);
    }
  }

  /**
   * Memperbarui akun milik pengguna. Perubahan saldo awal digeser ke saldo
   * berjalan lewat selisihnya, supaya mutasi transaksi yang sudah tercatat
   * tidak ikut hilang.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {string} uuid - UUID akun yang diperbarui.
   * @param {AccountInput} input - Data akun yang sudah tervalidasi.
   * @param {string} input.name - Nama akun.
   * @param {AccountType} input.type - Jenis akun, CASH atau BANK.
   * @param {string} input.openingBalance - Saldo awal akun yang baru.
   * @returns {Promise<AccountDTO>} Akun setelah diperbarui.
   * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
   * @throws {ConflictError} Jika nama akun sudah dipakai pengguna tersebut.
   */
  async update(userId: number, uuid: string, input: AccountInput): Promise<AccountDTO> {
    const account = await this.mustOwn(userId, uuid);

    const newOpeningBalance = new Prisma.Decimal(input.openingBalance);
    const openingBalanceDelta = newOpeningBalance.minus(account.openingBalance);

    try {
      const updated = await prisma.account.update({
        where: { id: account.id },
        data: {
          name: input.name,
          type: input.type,
          color: input.color,
          bankName: input.type === 'BANK' ? input.bankName : null,
          accountNumber: input.type === 'BANK' ? input.accountNumber : null,
          openingBalance: newOpeningBalance,
          ...(openingBalanceDelta.isZero() ? {} : { balance: { increment: openingBalanceDelta } }),
        },
        select: accountSelect,
      });

      return toDTO(updated);
    } catch (error) {
      throw toAccountError(error);
    }
  }

  /**
   * Menonaktifkan akun milik pengguna. Baris tidak dihapus supaya transaksi
   * lama yang menunjuk akun ini tetap dapat ditampilkan.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {string} uuid - UUID akun yang dinonaktifkan.
   * @returns {Promise<void>} Selesai setelah akun ditandai nonaktif.
   * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
   */
  async remove(userId: number, uuid: string): Promise<void> {
    const account = await this.mustOwn(userId, uuid);

    await prisma.account.update({
      where: { id: account.id },
      data: { isActive: false },
    });
  }

  /**
   * Mengaktifkan kembali akun yang sebelumnya dinonaktifkan.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {string} uuid - UUID akun yang diaktifkan kembali.
   * @returns {Promise<AccountDTO>} Akun setelah diaktifkan kembali.
   * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
   */
  async restore(userId: number, uuid: string): Promise<AccountDTO> {
    const account = await this.mustOwn(userId, uuid);

    const restored = await prisma.account.update({
      where: { id: account.id },
      data: { isActive: true },
      select: accountSelect,
    });

    return toDTO(restored);
  }

  /**
   * Menyemai akun bawaan untuk pengguna yang baru mendaftar. Dijalankan di
   * dalam transaksi pendaftaran supaya akun bawaan dan pengguna selalu tercipta
   * bersama-sama.
   * @param {Prisma.TransactionClient} transaction - Client Prisma milik transaksi pendaftaran.
   * @param {number} userId - ID pengguna yang baru dibuat.
   * @returns {Promise<Prisma.BatchPayload>} Ringkasan jumlah akun yang tercipta.
   */
  seedDefaults(transaction: Prisma.TransactionClient, userId: number) {
    return transaction.account.createMany({
      data: DEFAULT_ACCOUNTS.map(_account => ({ ..._account, userId })),
    });
  }

  /**
   * Memastikan sebuah akun benar-benar milik pengguna sebelum diubah, sekaligus
   * mengambil kolom yang dibutuhkan operasi perubahan.
   * @param {number} userId - ID pengguna pemilik akun.
   * @param {string} uuid - UUID akun yang diperiksa.
   * @returns {Promise<{ id: number; openingBalance: Prisma.Decimal }>} ID internal dan saldo awal akun.
   * @throws {NotFoundError} Jika akun tidak ada atau bukan milik pengguna tersebut.
   */
  private async mustOwn(userId: number, uuid: string) {
    const account = await prisma.account.findFirst({
      where: { uuid, userId },
      select: {
        id: true,
        openingBalance: true,
      },
    });

    if (!account) {
      throw new NotFoundError('Akun tidak ditemukan.');
    }

    return account;
  }
}

export const accountService = new AccountService();
