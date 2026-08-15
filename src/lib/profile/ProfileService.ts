import 'server-only';

import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/src/lib/Errors';
import { destroyOtherSessions, type SessionUser } from '@/src/lib/auth/AuthSession';
import type { ChangePasswordInput, ProfileInput } from './ProfileValidator';

const userSelect = {
  id: true,
  uuid: true,
  name: true,
  username: true,
  email: true,
} satisfies Prisma.UserSelect;

/**
 * Operasi penyuntingan profil dan password pengguna yang sedang masuk.
 */
class ProfileService {
  /**
   * Memperbarui nama dan username pengguna yang sedang masuk.
   * @param {number} userId - ID pengguna yang profilnya diubah.
   * @param {ProfileInput} input - Data profil yang sudah tervalidasi.
   * @param {string} input.name - Nama lengkap pengguna.
   * @param {string} input.username - Username unik pengguna.
   * @returns {Promise<SessionUser>} Data pengguna setelah diperbarui.
   * @throws {ConflictError} Jika username sudah dipakai pengguna lain.
   * @throws {NotFoundError} Jika akun pengguna sudah tidak ada.
   */
  async update(userId: number, input: ProfileInput): Promise<SessionUser> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { name: input.name, username: input.username },
        select: userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Username sudah digunakan.');
        }
        if (error.code === 'P2025') {
          throw new NotFoundError('Akun tidak ditemukan.');
        }
      }
      throw error;
    }
  }

  /**
   * Mengganti password pengguna setelah memverifikasi password lamanya. Sesi di
   * perangkat lain ikut dicabut karena penggantian password umumnya dilakukan
   * saat pengguna curiga akunnya dipakai orang lain.
   * @param {number} userId - ID pengguna yang mengganti password.
   * @param {ChangePasswordInput} input - Data penggantian password yang sudah tervalidasi.
   * @param {string} input.currentPassword - Password lama yang harus cocok.
   * @param {string} input.newPassword - Password baru yang akan di-hash.
   * @returns {Promise<void>} Selesai setelah password tersimpan dan sesi lain dicabut.
   * @throws {NotFoundError} Jika akun pengguna sudah tidak ada.
   * @throws {ValidationError} Jika password lama yang dimasukkan tidak cocok.
   */
  async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throw new NotFoundError('Akun tidak ditemukan.');

    const isCurrentPasswordValid = await argon2.verify(user.password, input.currentPassword).catch(() => false);

    if (!isCurrentPasswordValid) {
      throw new ValidationError({ currentPassword: ['Password saat ini salah.'] });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await argon2.hash(input.newPassword) },
    });

    await destroyOtherSessions(user.id);
  }
}

export const profileService = new ProfileService();
