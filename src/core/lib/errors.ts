import type { FieldErrors } from "./api-response";

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Silakan masuk terlebih dahulu.") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan.") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Data sudah digunakan.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Untuk kesalahan isian yang baru ketahuan di service (mis. password lama
 * salah). 401 tidak dipakai di sini: klien memantulkan 401 ke /login, padahal
 * sesi pengguna masih sah.
 */
export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors, message = "Periksa kembali isian Anda.") {
    super(message, 422);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}
