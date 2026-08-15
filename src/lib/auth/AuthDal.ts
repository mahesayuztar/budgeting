import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { UnauthorizedError } from '@/src/lib/Errors';
import { getSessionUser, type SessionUser } from './AuthSession';

/**
 * Mengambil pengguna sesi dengan hasil yang dimemoisasi `cache()` sepanjang
 * satu render pass, sehingga layout dan page yang sama-sama membutuhkan data
 * pengguna hanya memicu satu kueri database.
 * @returns {Promise<SessionUser | null>} Data pengguna pemilik sesi, atau null bila sesi tidak sah.
 */
export const getAuthUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser();
});

/**
 * Memastikan Server Component atau layout hanya dirender untuk pengguna yang
 * sudah masuk, dengan memantulkan pengunjung tanpa sesi ke halaman login.
 * @returns {Promise<SessionUser>} Data pengguna pemilik sesi yang sah.
 */
export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Memastikan route handler hanya melayani pengguna yang sudah masuk. Error yang
 * dilempar dipetakan menjadi respons 401 oleh `handleApiError`.
 * @returns {Promise<SessionUser>} Data pengguna pemilik sesi yang sah.
 * @throws {UnauthorizedError} Jika permintaan datang tanpa sesi yang sah.
 */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getAuthUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
