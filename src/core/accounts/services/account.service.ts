import "server-only";

import { AccountType, Prisma } from "@prisma/client";
import { prisma } from "@/src/core/lib/prisma";
import { ConflictError, NotFoundError } from "@/src/core/lib/errors";
import type { AccountInput } from "../validators/account.validator";
import { DEFAULT_ACCOUNTS } from "../account.constants";

export type AccountDTO = {
  uuid: string;
  name: string;
  type: AccountType;
  color: string | null;
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: string;
  balance: string;
  isActive: boolean;
};

export type AccountUsageDTO = AccountDTO & {
  transactionCount: number;
};

const select = {
  uuid: true,
  name: true,
  type: true,
  color: true,
  bankName: true,
  accountNumber: true,
  openingBalance: true,
  balance: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

type AccountRow = Prisma.AccountGetPayload<{
  select: typeof select;
}>;

class AccountService {
  async list(
    userId: number,
    type?: AccountType,
    includeInactive = false,
  ): Promise<AccountDTO[]> {
    const rows = await prisma.account.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(!includeInactive ? { isActive: true } : {}),
      },
      select,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return rows.map(toDTO);
  }

  async listWithUsage(userId: number): Promise<AccountUsageDTO[]> {
    const rows = await prisma.account.findMany({
      where: { userId },
      select: {
        ...select,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return rows.map(({ _count, ...account }) => ({
      ...toDTO(account),
      transactionCount: _count.transactions,
    }));
  }

  async get(userId: number, uuid: string): Promise<AccountDTO> {
    const account = await prisma.account.findFirst({
      where: {
        uuid,
        userId,
      },
      select,
    });

    if (!account) {
      throw new NotFoundError("Akun tidak ditemukan.");
    }

    return toDTO(account);
  }

  async create(userId: number, input: AccountInput): Promise<AccountDTO> {
    const openingBalance = new Prisma.Decimal(input.openingBalance);

    try {
      const account = await prisma.account.create({
        data: {
          userId,
          name: input.name,
          type: input.type,
          color: input.color,
          bankName: input.type === "BANK" ? input.bankName : null,
          accountNumber: input.type === "BANK" ? input.accountNumber : null,
          openingBalance,
          balance: openingBalance,
        },
        select,
      });

      return toDTO(account);
    } catch (error) {
      throw toAccountError(error);
    }
  }

  async update(
    userId: number,
    uuid: string,
    input: AccountInput,
  ): Promise<AccountDTO> {
    const account = await this.mustOwn(userId, uuid);

    const newOpeningBalance = new Prisma.Decimal(input.openingBalance);
    const openingBalanceDelta = newOpeningBalance.minus(
      account.openingBalance,
    );

    try {
      const updated = await prisma.account.update({
        where: {
          id: account.id,
        },
        data: {
          name: input.name,
          type: input.type,
          color: input.color,
          bankName: input.type === "BANK" ? input.bankName : null,
          accountNumber: input.type === "BANK" ? input.accountNumber : null,
          openingBalance: newOpeningBalance,
          ...(openingBalanceDelta.isZero()
            ? {}
            : {
                balance: {
                  increment: openingBalanceDelta,
                },
              }),
        },
        select,
      });

      return toDTO(updated);
    } catch (error) {
      throw toAccountError(error);
    }
  }

  async remove(userId: number, uuid: string): Promise<void> {
    const account = await this.mustOwn(userId, uuid);

    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        isActive: false,
      },
    });
  }

  async restore(userId: number, uuid: string): Promise<AccountDTO> {
    const account = await this.mustOwn(userId, uuid);

    const restored = await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        isActive: true,
      },
      select,
    });

    return toDTO(restored);
  }

  seedDefaults(tx: Prisma.TransactionClient, userId: number) {
    return tx.account.createMany({
      data: DEFAULT_ACCOUNTS.map((account) => ({
        ...account,
        userId,
      })),
    });
  }

  private async mustOwn(userId: number, uuid: string) {
    const account = await prisma.account.findFirst({
      where: {
        uuid,
        userId,
      },
      select: {
        id: true,
        openingBalance: true,
      },
    });

    if (!account) {
      throw new NotFoundError("Akun tidak ditemukan.");
    }

    return account;
  }
}

function toDTO(account: AccountRow): AccountDTO {
  return {
    ...account,
    openingBalance: account.openingBalance.toString(),
    balance: account.balance.toString(),
  };
}

function toAccountError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new ConflictError("Akun dengan nama ini sudah ada.");
  }

  return error;
}

export const accountService = new AccountService();