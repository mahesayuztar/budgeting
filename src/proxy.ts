import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/src/lib/auth/AuthSession';

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/debts', '/reports', '/profile'];
const GUEST_ONLY_PATHS = ['/login', '/register'];

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
  const isProtected = PROTECTED_PREFIXES.some(_prefix => pathname === _prefix || pathname.startsWith(`${_prefix}/`));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if (GUEST_ONLY_PATHS.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|ttf|woff2?)$).*)'],
};
