import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/src/core/auth/session";

const PROTECTED_PREFIXES = ["/dashboard", "/transactions", "/debts", "/reports"];
const GUEST_ONLY_PATHS = ["/login", "/register"];

/**
 * Pemeriksaan optimistik saja: hanya melihat keberadaan cookie, tanpa query
 * database. Proxy ikut jalan pada setiap prefetch, jadi query di sini akan
 * mahal. Validasi token yang sebenarnya ada di DAL dan route handler.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = new URL("/login", request.nextUrl);
    return NextResponse.redirect(url);
  }

  if (GUEST_ONLY_PATHS.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|ttf|woff2?)$).*)"],
};
