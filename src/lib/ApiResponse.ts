import { ZodError } from 'zod';
import { AppError, ValidationError } from './Errors';
import { logger } from './Logger';

export type FieldErrors = Record<string, string[]>;

export type ApiSuccess<T> = { success: true; data: T };

export type ApiFailure = {
  success: false;
  message: string;
  errors?: FieldErrors;
};

/**
 * Membungkus data menjadi respons JSON sukses dengan bentuk yang seragam.
 * @param {T} data - Payload yang dikirim ke klien.
 * @param {number} status - Status HTTP respons, default 200.
 * @returns {Response} Respons JSON dengan properti `success` bernilai true.
 */
export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

/**
 * Membungkus pesan error menjadi respons JSON gagal dengan bentuk yang seragam.
 * @param {string} message - Pesan error yang ditampilkan ke pengguna.
 * @param {number} status - Status HTTP respons, default 400.
 * @param {FieldErrors} errors - Pesan error per field form, opsional.
 * @returns {Response} Respons JSON dengan properti `success` bernilai false.
 */
export function fail(message: string, status = 400, errors?: FieldErrors) {
  return Response.json({ success: false, message, errors } satisfies ApiFailure, {
    status,
  });
}

/**
 * Mengumpulkan pesan error per field dari `issues` milik ZodError versi 4.
 * Issue tanpa path dikelompokkan ke kunci `_` sebagai error tingkat form.
 * @param {ZodError} error - Error hasil parsing skema Zod.
 * @returns {FieldErrors} Peta nama field ke daftar pesan error.
 */
function getFieldErrorsFromZodError(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const _issue of error.issues) {
    const key = _issue.path.length > 0 ? _issue.path.join('.') : '_';
    (errors[key] ??= []).push(_issue.message);
  }

  return errors;
}

/**
 * Satu-satunya tempat error diterjemahkan menjadi respons HTTP. Semua route
 * handler membungkus body-nya dengan try/catch yang memanggil function ini,
 * sehingga bentuk respons gagal konsisten di seluruh endpoint.
 * @param {unknown} error - Error apa pun yang tertangkap di route handler.
 * @returns {Response} Respons JSON gagal dengan status sesuai jenis error.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail('Periksa kembali isian Anda.', 422, getFieldErrorsFromZodError(error));
  }

  if (error instanceof ValidationError) {
    return fail(error.message, error.status, error.fieldErrors);
  }

  if (error instanceof AppError) {
    return fail(error.message, error.status);
  }

  logger.error({ err: error }, 'unhandled api error');
  return fail('Terjadi kesalahan pada server.', 500);
}
