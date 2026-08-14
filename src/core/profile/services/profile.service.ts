import "server-only";

import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/src/core/lib/errors";
import { destroyOtherSessions, type SessionUser } from "@/src/core/auth/session";
import type {
  ChangePasswordInput,
  ProfileInput,
} from "../validators/profile.validator";

const select = {
  id: true,
  uuid: true,
  name: true,
  username: true,
  email: true,
} satisfies Prisma.UserSelect;

class ProfileService {
  async update(userId: number, input: ProfileInput): Promise<SessionUser> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { name: input.name, username: input.username },
        select,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictError("Username sudah digunakan.");
        }
        if (error.code === "P2025") {
          throw new NotFoundError("Akun tidak ditemukan.");
        }
      }
      throw error;
    }
  }

  async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throw new NotFoundError("Akun tidak ditemukan.");

    const valid = await argon2
      .verify(user.password, input.currentPassword)
      .catch(() => false);

    if (!valid) {
      throw new ValidationError({ currentPassword: ["Password saat ini salah."] });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await argon2.hash(input.newPassword) },
    });

    // Ganti password biasanya dilakukan karena curiga akun dipakai orang lain,
    // jadi sesi di perangkat lain ikut dicabut.
    await destroyOtherSessions(user.id);
  }
}

export const profileService = new ProfileService();
