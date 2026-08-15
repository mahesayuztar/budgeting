import { toDateInputValue } from '@/src/helpers/DateHelper';
import type { TransactionDTO } from './TransactionService';
import type { TransactionInput } from './TransactionValidator';

/**
 * Bentuk state form transaksi. Seluruh field mengikuti `TransactionInput`,
 * kontrak yang sama yang diterima api client, sehingga satu alur data cukup
 * dipegang satu state. Hanya `amount` yang dilonggarkan menjadi string karena
 * `<input type="number">` selalu memberi string, sementara `TransactionInput`
 * sudah memakai hasil coerce Zod berupa number.
 */
export type TransactionFormState = Omit<TransactionInput, 'amount'> & {
  amount: string;
};

/**
 * Menyusun state awal form untuk transaksi baru. Akun pertama dipilih lebih
 * dulu supaya form tidak terkirim tanpa akun ketika pengguna hanya punya satu.
 * @param {string} defaultAccountUuid - UUID akun yang dipilih secara bawaan, opsional.
 * @returns {TransactionFormState} State form kosong siap pakai.
 */
export function createEmptyTransactionForm(defaultAccountUuid?: string): TransactionFormState {
  return {
    type: 'EXPENSE',
    amount: '',
    categoryUuid: null,
    accountUuid: defaultAccountUuid ?? null,
    note: null,
    occurredAt: toDateInputValue(new Date()),
  };
}

/**
 * Menyusun state form dari transaksi yang sudah tersimpan, dipakai saat sheet
 * dibuka dalam mode ubah. Akun ikut diisi ulang karena payload perubahan selalu
 * dikirim utuh: tanpa itu transaksi akan tersimpan tanpa akun dan saldonya
 * ditarik kembali padahal pengguna tidak mengubah akunnya.
 * @param {TransactionDTO} transaction - Transaksi yang akan diubah.
 * @returns {TransactionFormState} State form berisi nilai transaksi tersebut.
 */
export function toTransactionFormState(transaction: TransactionDTO): TransactionFormState {
  return {
    type: transaction.type,
    amount: String(transaction.amount),
    categoryUuid: transaction.category?.uuid ?? null,
    accountUuid: transaction.account?.uuid ?? null,
    note: transaction.note,
    occurredAt: transaction.occurredAt,
  };
}

/**
 * Menerjemahkan state form menjadi payload yang diterima api transaksi. Nilai
 * uuid kosong diubah menjadi null supaya tidak ditolak validator sebagai uuid
 * yang tidak sah, dan `amount` dikembalikan ke number.
 * @param {TransactionFormState} form - State form yang sedang diisi pengguna.
 * @returns {TransactionInput} Payload siap kirim ke api transaksi.
 */
export function toTransactionInput(form: TransactionFormState): TransactionInput {
  return {
    type: form.type,
    amount: Number(form.amount),
    categoryUuid: form.categoryUuid || null,
    accountUuid: form.accountUuid || null,
    note: form.note || null,
    occurredAt: form.occurredAt,
  };
}
