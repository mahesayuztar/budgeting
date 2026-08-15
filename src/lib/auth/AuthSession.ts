import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/src/lib/Prisma';

export const SESSION_COOKIE = 'budgeting_session';

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  uuid: string;
  name: string;
  username: string;
  email: string;
};

/**
 * Menghitung hash token sesi. Cookie menyimpan token acak sementara database
 * hanya menyimpan hash-nya, sehingga bocornya isi tabel `sessions` tidak cukup
 * untuk membajak sesi pengguna.
 * @param {string} token - Token sesi mentah yang tersimpan di cookie.
 * @returns {string} Hash SHA-256 token dalam bentuk heksadesimal.
 */
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Membuat sesi baru untuk seorang pengguna, menyimpan hash token beserta jejak
 * perangkatnya ke database, lalu memasang cookie sesi httpOnly.
 * @param {number} userId - ID pengguna pemilik sesi.
 * @returns {Promise<{ token: string; expiresAt: Date }>} Token sesi mentah dan waktu kedaluwarsanya.
 */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipAddress: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: headerList.get('user-agent')?.slice(0, 255) ?? null,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Mengambil pengguna pemilik sesi yang sedang aktif. Validasi dilakukan dengan
 * mencocokkan token ke database, bukan sekadar memeriksa keberadaan cookie.
 * Sesi kedaluwarsa langsung dihapus, dan pengguna nonaktif atau terhapus
 * diperlakukan sebagai tidak punya sesi.
 * @returns {Promise<SessionUser | null>} Data pengguna pemilik sesi, atau null bila sesi tidak sah.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          uuid: true,
          name: true,
          username: true,
          email: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user } = session;
  if (!user.isActive || user.deletedAt) return null;

  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    username: user.username,
    email: user.email,
  };
}

/**
 * Menghapus sesi yang sedang dipakai dari database sekaligus melepas cookie
 * sesi di perangkat pengguna.
 * @returns {Promise<void>} Selesai setelah sesi dan cookie dibersihkan.
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Mencabut seluruh sesi pengguna kecuali sesi yang sedang dipakai. Dijalankan
 * setelah pengguna mengganti password, supaya perangkat lain ikut keluar tanpa
 * melempar pengguna yang sedang aktif kembali ke halaman login.
 * @param {number} userId - ID pengguna yang sesinya dicabut.
 * @returns {Promise<void>} Selesai setelah sesi perangkat lain dihapus.
 */
export async function destroyOtherSessions(userId: number) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  await prisma.session.deleteMany({
    where: {
      userId,
      ...(token ? { tokenHash: { not: hashToken(token) } } : {}),
    },
  });
}
