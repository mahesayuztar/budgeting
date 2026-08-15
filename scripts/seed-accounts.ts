import { DEFAULT_CASH_ACCOUNT } from '@/src/lib/accounts/AccountConstants';
import { prisma } from '@/src/lib/Prisma';

/**
 * Menyiapkan akun Cash bawaan untuk satu pengguna lama, lalu menautkan seluruh
 * transaksinya yang belum punya akun ke akun tersebut. Keduanya dijalankan
 * dalam satu transaksi supaya transaksi tidak pernah menunjuk akun yang gagal
 * dibuat.
 * @param {number} userId - ID pengguna yang diproses.
 * @returns {Promise<{ accountCreated: boolean; transactionsUpdated: number }>} Penanda apakah akun baru dibuat dan jumlah transaksi yang ditautkan.
 */
async function backfillUserAccount(userId: number) {
  return prisma.$transaction(async transaction => {
    let cashAccount = await transaction.account.findFirst({
      where: {
        userId,
        name: DEFAULT_CASH_ACCOUNT.name,
        type: DEFAULT_CASH_ACCOUNT.type,
      },
      select: { id: true },
    });

    let accountCreated = false;

    if (!cashAccount) {
      cashAccount = await transaction.account.create({
        data: { ...DEFAULT_CASH_ACCOUNT, userId },
        select: { id: true },
      });

      accountCreated = true;
    }

    const updatedTransactions = await transaction.transaction.updateMany({
      where: { userId, accountId: null },
      data: { accountId: cashAccount.id },
    });

    return { accountCreated, transactionsUpdated: updatedTransactions.count };
  });
}

/**
 * Menjalankan backfill akun Cash untuk seluruh pengguna yang sudah ada, lalu
 * mencetak ringkasan hasilnya ke terminal.
 * @returns {Promise<void>} Selesai setelah seluruh pengguna diproses.
 */
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  let accountsCreated = 0;
  let transactionsUpdated = 0;

  for (const _user of users) {
    const result = await backfillUserAccount(_user.id);

    if (result.accountCreated) accountsCreated += 1;
    transactionsUpdated += result.transactionsUpdated;

    console.log(`User ${_user.id}: ${result.accountCreated ? 'Cash dibuat' : 'Cash sudah ada'}, ${result.transactionsUpdated} transaksi di-update`);
  }

  console.log('');
  console.log(`User diproses: ${users.length}`);
  console.log(`Account Cash dibuat: ${accountsCreated}`);
  console.log(`Transaksi di-update: ${transactionsUpdated}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
