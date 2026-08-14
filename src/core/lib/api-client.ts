import type { FieldErrors } from "./api-response";

export type { FieldErrors };

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export type RequestOptions = {
  params?: QueryParams;
  signal?: AbortSignal;
};

const GENERIC_ERROR = "Terjadi kesalahan pada server.";
const NETWORK_ERROR = "Tidak dapat terhubung ke server.";

function buildUrl(path: string, params?: QueryParams) {
  if (!params) return path;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Login/register memang membalas 401 untuk kredensial salah. Tanpa
 * pengecualian ini, halaman akan memantul ke /login sebelum pesan errornya
 * sempat tampil.
 */
function shouldRedirectOn401(path: string) {
  return !path.startsWith("/api/auth/");
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
}

function toApiError(
  response: Response,
  payload: unknown,
  path: string,
): ApiError {
  const body = (payload ?? {}) as { message?: string; errors?: FieldErrors };

  if (response.status === 401 && shouldRedirectOn401(path)) {
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  return new ApiError(
    body.message ?? GENERIC_ERROR,
    response.status,
    body.errors,
  );
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path, options?.params), {
      method,
      credentials: "same-origin",
      signal: options?.signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(NETWORK_ERROR, 0);
  }

  const payload = await parseJson(response);

  if (!response.ok) throw toApiError(response, payload, path);

  const envelope = payload as { success?: boolean; data?: T } | null;
  if (!envelope?.success) throw toApiError(response, payload, path);

  return envelope.data as T;
}

/**
 * Satu-satunya pintu keluar HTTP di sisi klien. Komponen tidak pernah
 * menyentuh `fetch`, `res.ok`, atau `res.json()`.
 */
export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),

  /** Unduh file biner (PDF). Respons JSON berarti error, bukan file. */
  async download(path: string, filename: string, options?: RequestOptions) {
    let response: Response;

    try {
      response = await fetch(buildUrl(path, options?.params), {
        credentials: "same-origin",
        signal: options?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError(NETWORK_ERROR, 0);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || contentType.includes("application/json")) {
      throw toApiError(response, await parseJson(response), path);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
