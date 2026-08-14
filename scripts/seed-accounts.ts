import { DEFAULT_CASH_ACCOUNT } from "@/src/core/accounts/account.constants";
import { prisma } from "@/src/core/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  let accountsCreated = 0;
  let transactionsUpdated = 0;

  for (const user of users) {
    const result = await prisma.$transaction(async (tx) => {
      let cashAccount = await tx.account.findFirst({
        where: {
          userId: user.id,
          name: DEFAULT_CASH_ACCOUNT.name,
          type: DEFAULT_CASH_ACCOUNT.type,
        },
        select: {
          id: true,
        },
      });

      let accountCreated = false;

      if (!cashAccount) {
        cashAccount = await tx.account.create({
          data: {
            ...DEFAULT_CASH_ACCOUNT,
            userId: user.id,
          },
          select: {
            id: true,
          },
        });

        accountCreated = true;
      }

      const updatedTransactions = await tx.transaction.updateMany({
        where: {
          userId: user.id,
          accountId: null,
        },
        data: {
          accountId: cashAccount.id,
        },
      });

      return {
        accountCreated,
        transactionsUpdated: updatedTransactions.count,
      };
    });

    if (result.accountCreated) {
      accountsCreated++;
    }

    transactionsUpdated += result.transactionsUpdated;

    console.log(
      `User ${user.id}: ${result.accountCreated ? "Cash dibuat" : "Cash sudah ada"}, ${result.transactionsUpdated} transaksi di-update`,
    );
  }

  console.log("");
  console.log(`User diproses: ${users.length}`);
  console.log(`Account Cash dibuat: ${accountsCreated}`);
  console.log(`Transaksi di-update: ${transactionsUpdated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });