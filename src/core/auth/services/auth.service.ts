import "server-only";

import argon2 from "argon2";
import { prisma } from "@/src/core/lib/prisma";
import { AppError, ConflictError } from "@/src/core/lib/errors";
import { categoryService } from "@/src/core/categories/services/category.service";
import { createSession, destroySession, type SessionUser } from "../session";
import type { RegisterInput } from "../validators/register.validator";
import type { LoginInput } from "../validators/login.validator";

const INVALID_CREDENTIALS = "Email atau password salah.";

class AuthService {
  async register(input: RegisterInput): Promise<SessionUser> {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      throw new ConflictError(
        existing.email === input.email
          ? "Email sudah terdaftar."
          : "Username sudah digunakan.",
      );
    }

    const password = await argon2.hash(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
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

      await categoryService.seedDefaults(tx, created.id);
      return created;
    });

    await createSession(user.id);
    return user;
  }

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
      throw new AppError(INVALID_CREDENTIALS, 401);
    }

    const valid = await argon2
      .verify(user.password, input.password)
      .catch(() => false);
    if (!valid) {
      throw new AppError(INVALID_CREDENTIALS, 401);
    }

    if (!user.isActive) {
      throw new AppError("Akun Anda tidak aktif. Hubungi administrator.", 403);
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

  async logout() {
    await destroySession();
  }
}

export const authService = new AuthService();
