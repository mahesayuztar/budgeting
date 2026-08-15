import { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/Prisma';

/**
 * Menghitung ulang saldo seluruh akun dari riwayat transaksinya: saldo awal
 * ditambah pengaruh setiap transaksi yang menyentuh akun tersebut. INCOME
 * menambah, EXPENSE mengurangi, dan TRANSFER mengurangi akun sumber sekaligus
 * menambah akun tujuan. Dijalankan sekali saat mutasi saldo mulai diberlakukan,
 * supaya saldo yang tersimpan konsisten dengan transaksi yang sudah tercatat
 * sejak sebelum mekanisme ini ada.
 * @returns {Promise<void>} Selesai setelah seluruh saldo akun diperbarui.
 */
async function main() {
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, openingBalance: true, balance: true },
    orderBy: { id: 'asc' },
  });

  let changed = 0;

  for (const _account of accounts) {
    const [outgoing, incoming] = await Promise.all([
      prisma.transaction.findMany({
        where: { accountId: _account.id },
        select: { type: true, amount: true },
      }),
      prisma.transaction.aggregate({
        where: { toAccountId: _account.id, type: 'TRANSFER' },
        _sum: { amount: true },
      }),
    ]);

    let expected = _account.openingBalance;

    for (const _transaction of outgoing) {
      if (_transaction.type === 'INCOME') expected = expected.plus(_transaction.amount);
      else expected = expected.minus(_transaction.amount);
    }

    expected = expected.plus(incoming._sum.amount ?? new Prisma.Decimal(0));

    if (expected.equals(_account.balance)) continue;

    await prisma.account.update({
      where: { id: _account.id },
      data: { balance: expected },
    });

    changed += 1;
    console.log(`Account ${_account.id} (${_account.name}): ${_account.balance.toString()} -> ${expected.toString()}`);
  }

  console.log('');
  console.log(`Akun diperiksa: ${accounts.length}`);
  console.log(`Saldo diperbarui: ${changed}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
