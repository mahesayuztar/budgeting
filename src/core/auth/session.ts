import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/src/core/lib/prisma";

export const SESSION_COOKIE = "budgeting_session";

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Cookie menyimpan token acak; database hanya menyimpan hash-nya, sehingga
 * bocornya isi tabel Session tidak cukup untuk membajak sesi.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: number;
  uuid: string;
  name: string;
  username: string;
  email: string;
};

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipAddress:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

/** Validasi sesungguhnya: cek token ke database, bukan sekadar ada cookie. */
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

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Dipakai setelah ganti password: sesi di perangkat lain dicabut, sesi yang
 * sedang dipakai tetap hidup supaya pengguna tidak terlempar ke login.
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
