import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/src/lib/auth/AuthSession';

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/debts', '/reports', '/profile'];

/**
 * Mengarahkan pengunjung sebelum halaman dirender: rute terlindung menolak
 * pengunjung tanpa cookie sesi, dan halaman masuk atau daftar mengalihkan
 * pengguna yang sudah masuk ke dashboard. Pemeriksaan di sini sengaja hanya
 * melihat keberadaan cookie tanpa menyentuh database, karena proxy ikut
 * berjalan pada setiap prefetch sehingga kueri di sini akan mahal. Validasi
 * token yang sebenarnya dikerjakan di DAL dan route handler.
 * @param {NextRequest} request - Permintaan yang sedang diproses.
 * @returns {NextResponse} Pengalihan halaman, atau kelanjutan permintaan apa adanya.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some(
    _prefix =>
      pathname === _prefix ||
      pathname.startsWith(`${_prefix}/`)
  );

  if (isProtected && !hasSession) {
    return NextResponse.redirect(
      new URL('/login', request.nextUrl)
    );
  }

  return NextResponse.next();
}