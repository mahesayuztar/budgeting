import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";

export type FieldErrors = Record<string, string[]>;

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  message: string;
  errors?: FieldErrors;
};

export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

export function fail(message: string, status = 400, errors?: FieldErrors) {
  return Response.json({ success: false, message, errors } satisfies ApiFailure, {
    status,
  });
}

/**
 * Satu-satunya tempat error diterjemahkan menjadi respons HTTP.
 * Semua route handler membungkus body-nya dengan try/catch yang memanggil ini.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const flattened = z4FieldErrors(error);
    return fail("Periksa kembali isian Anda.", 422, flattened);
  }

  if (error instanceof ValidationError) {
    return fail(error.message, error.status, error.fieldErrors);
  }

  if (error instanceof AppError) {
    return fail(error.message, error.status);
  }

  console.error("[api] unhandled error:", error);
  return fail("Terjadi kesalahan pada server.", 500);
}

/** Zod v4: kumpulkan pesan error per field dari `issues`. */
function z4FieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}
