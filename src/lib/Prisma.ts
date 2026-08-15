import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

/**
 * Mengambil satu instance PrismaClient yang dipakai bersama seluruh aplikasi.
 * Pada development instance disimpan di globalThis supaya hot reload Next.js
 * tidak terus membuka koneksi database baru.
 * @returns {PrismaClient} Instance PrismaClient yang siap dipakai.
 */
function getPrismaClient(): PrismaClient {
  const client = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
