import 'server-only';

import argon2 from 'argon2';
import { prisma } from '@/src/lib/Prisma';
import { AppError, ConflictError } from '@/src/lib/Errors';
import { categoryService } from '@/src/lib/categories/CategoryService';
import { accountService } from '@/src/lib/accounts/AccountService';
import { createSession, destroySession, type SessionUser } from './AuthSession';
import type { RegisterInput } from './RegisterValidator';
import type { LoginInput } from './LoginValidator';

const INVALID_CREDENTIALS_MESSAGE = 'Email atau password salah.';

/**
 * Operasi pendaftaran, masuk, dan keluar pengguna. Setiap operasi yang
 * berhasil selalu berakhir dengan sesi yang sudah disesuaikan, sehingga
 * pemanggil tidak perlu mengurus cookie sesi sendiri.
 */
class AuthService {
  /**
   * Mendaftarkan pengguna baru, menyemai kategori dan akun bawaan dalam satu
   * transaksi, lalu langsung membuatkan sesi supaya pengguna tidak perlu masuk
   * ulang setelah pendaftaran.
   * @param {RegisterInput} input - Data pendaftaran yang sudah tervalidasi.
   * @param {string} input.name - Nama lengkap pengguna.
   * @param {string} input.username - Username unik pengguna.
   * @param {string} input.email - Alamat email unik pengguna.
   * @param {string} input.password - Password mentah yang akan di-hash.
   * @returns {Promise<SessionUser>} Data pengguna yang baru terdaftar.
   * @throws {ConflictError} Jika email atau username sudah dipakai pengguna lain.
   */
  async register(input: RegisterInput): Promise<SessionUser> {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true, username: true },
    });

    if (existingUser) {
      throw new ConflictError(existingUser.email === input.email ? 'Email sudah terdaftar.' : 'Username sudah digunakan.');
    }

    const password = await argon2.hash(input.password);

    const user = await prisma.$transaction(async transaction => {
      const createdUser = await transaction.user.create({
        data: {
          name: input.name,
          username: input.username,
          email: input.email,
          password,
        },
        select: {
          id: true,
          uuid: true,
          name: true,
          username: true,
          email: true,
        },
      });

      await categoryService.seedDefaults(transaction, createdUser.id);
      await accountService.seedDefaults(transaction, createdUser.id);
      return createdUser;
    });

    await createSession(user.id);
    return user;
  }

  /**
   * Memverifikasi kredensial pengguna, mencatat waktu masuk terakhir, lalu
   * membuat sesi baru. Email yang tidak terdaftar dan password yang salah
   * dibalas pesan yang sama supaya keberadaan sebuah akun tidak bocor.
   * @param {LoginInput} input - Kredensial masuk yang sudah tervalidasi.
   * @param {string} input.email - Alamat email pengguna.
   * @param {string} input.password - Password mentah yang dicocokkan ke hash.
   * @returns {Promise<SessionUser>} Data pengguna yang berhasil masuk.
   * @throws {AppError} Jika kredensial salah (401) atau akun tidak aktif (403).
   */
  async login(input: LoginInput): Promise<SessionUser> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        uuid: true,
        name: true,
        username: true,
        email: true,
        password: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    const isPasswordValid = await argon2.verify(user.password, input.password).catch(() => false);

    if (!isPasswordValid) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    if (!user.isActive) {
      throw new AppError('Akun Anda tidak aktif. Hubungi administrator.', 403);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession(user.id);

    return {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * Mengakhiri sesi yang sedang dipakai pengguna.
   * @returns {Promise<void>} Selesai setelah sesi dan cookie dibersihkan.
   */
  async logout() {
    await destroySession();
  }
}

export const authService = new AuthService();
