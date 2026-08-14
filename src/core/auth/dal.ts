import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { UnauthorizedError } from "@/src/core/lib/errors";
import { getSessionUser, type SessionUser } from "./session";

/**
 * `cache()` memoize hasilnya sepanjang satu render pass, jadi layout + page
 * yang sama-sama butuh user hanya memicu satu query.
 */
export const getAuthUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser();
});

/** Untuk Server Component / layout: lempar pengguna ke halaman login. */
export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** Untuk Route Handler: dipetakan ke 401 oleh `handleApiError`. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getAuthUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
