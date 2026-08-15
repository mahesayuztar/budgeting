import type { FieldErrors } from './ApiResponse';

/**
 * Error dasar aplikasi yang membawa status HTTP, sehingga route handler dapat
 * menerjemahkannya menjadi respons tanpa memetakan tipe error satu per satu.
 * @param {string} message - Pesan yang ditampilkan ke pengguna.
 * @param {number} status - Status HTTP yang mewakili error, default 400.
 * @returns {AppError} Instance error aplikasi.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/**
 * Error untuk permintaan tanpa sesi yang sah, dipetakan ke status 401.
 * @param {string} message - Pesan yang ditampilkan ke pengguna.
 * @returns {UnauthorizedError} Instance error 401.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Silakan masuk terlebih dahulu.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error untuk data yang tidak ditemukan, dipetakan ke status 404.
 * @param {string} message - Pesan yang ditampilkan ke pengguna.
 * @returns {NotFoundError} Instance error 404.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan.') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error untuk data yang bentrok dengan data lain, dipetakan ke status 409.
 * @param {string} message - Pesan yang ditampilkan ke pengguna.
 * @returns {ConflictError} Instance error 409.
 */
export class ConflictError extends AppError {
  constructor(message = 'Data sudah digunakan.') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Error untuk kesalahan isian yang baru ketahuan di service, misalnya password
 * lama yang salah. Status 401 sengaja tidak dipakai karena klien memantulkan
 * 401 ke halaman login, padahal sesi pengguna masih sah.
 * @param {FieldErrors} fieldErrors - Pesan error per field form.
 * @param {string} message - Pesan ringkas yang ditampilkan di atas form.
 * @returns {ValidationError} Instance error 422 beserta detail per field.
 */
export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors, message = 'Periksa kembali isian Anda.') {
    super(message, 422);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
