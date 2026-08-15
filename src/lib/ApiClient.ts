import type { FieldErrors } from './ApiResponse';

export type { FieldErrors };

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = {
  params?: QueryParams;
  signal?: AbortSignal;
};

const GENERIC_ERROR_MESSAGE = 'Terjadi kesalahan pada server.';
const NETWORK_ERROR_MESSAGE = 'Tidak dapat terhubung ke server.';

/**
 * Error yang dilempar api client ketika permintaan HTTP gagal, lengkap dengan
 * status respons dan pesan error per field bila server mengirimkannya.
 * @param {string} message - Pesan error yang ditampilkan ke pengguna.
 * @param {number} status - Status HTTP respons, bernilai 0 bila jaringan gagal.
 * @param {FieldErrors} fieldErrors - Pesan error per field form, opsional.
 * @returns {ApiError} Instance error sisi klien.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Menyusun URL akhir dari path dan query params, melewati nilai kosong supaya
 * query string tidak berisi parameter tanpa arti.
 * @param {string} path - Path endpoint tanpa query string.
 * @param {QueryParams} params - Pasangan nama dan nilai query params, opsional.
 * @returns {string} URL lengkap beserta query string bila ada.
 */
function buildUrl(path: string, params?: QueryParams) {
  if (!params) return path;

  const search = new URLSearchParams();

  for (const [_key, _value] of Object.entries(params)) {
    if (_value === undefined || _value === null || _value === '') continue;
    search.set(_key, String(_value));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Menentukan apakah respons 401 pada sebuah path perlu memantulkan pengguna ke
 * halaman login. Endpoint login dan register dikecualikan karena keduanya
 * memang membalas 401 untuk kredensial salah, dan pantulan akan menutup pesan
 * error sebelum sempat terbaca.
 * @param {string} path - Path endpoint yang sedang dipanggil.
 * @returns {boolean} true jika pengguna perlu dipantulkan ke halaman login.
 */
function shouldRedirectOn401(path: string) {
  return !path.startsWith('/api/auth/');
}

/**
 * Membaca body respons sebagai JSON bila content-type-nya memang JSON.
 * @param {Response} response - Respons hasil fetch.
 * @returns {Promise<unknown>} Payload JSON, atau null bila bukan JSON atau gagal diurai.
 */
async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json().catch(() => null);
}

/**
 * Menerjemahkan respons gagal menjadi ApiError, sekaligus memantulkan pengguna
 * ke halaman login bila sesinya sudah tidak sah.
 * @param {Response} response - Respons hasil fetch yang dianggap gagal.
 * @param {unknown} payload - Body respons yang sudah diurai, bila ada.
 * @param {string} path - Path endpoint yang sedang dipanggil.
 * @returns {ApiError} Error siap lempar berisi pesan dan status respons.
 */
function toApiError(response: Response, payload: unknown, path: string): ApiError {
  const body = (payload ?? {}) as { message?: string; errors?: FieldErrors };

  if (response.status === 401 && shouldRedirectOn401(path)) {
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  return new ApiError(body.message ?? GENERIC_ERROR_MESSAGE, response.status, body.errors);
}

/**
 * Menjalankan satu permintaan HTTP JSON dan membuka amplop respons standar
 * aplikasi, sehingga pemanggil langsung menerima payload `data`.
 * @param {string} method - Metode HTTP yang dipakai.
 * @param {string} path - Path endpoint tanpa query string.
 * @param {unknown} body - Body permintaan yang akan diserialisasi ke JSON, opsional.
 * @param {RequestOptions} options - Query params dan AbortSignal, opsional.
 * @returns {Promise<T>} Payload `data` dari respons sukses.
 * @throws {ApiError} Jika jaringan gagal, respons tidak ok, atau amplop menandai gagal.
 */
async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path, options?.params), {
      method,
      credentials: 'same-origin',
      signal: options?.signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  const payload = await parseJson(response);

  if (!response.ok) throw toApiError(response, payload, path);

  const envelope = payload as { success?: boolean; data?: T } | null;
  if (!envelope?.success) throw toApiError(response, payload, path);

  return envelope.data as T;
}

/**
 * Menjalankan permintaan HTTP yang membalas file biner. Content-type ikut
 * diperiksa karena endpoint biner tetap membalas JSON ketika gagal, sehingga
 * `response.ok` saja tidak cukup untuk memastikan isinya benar-benar file.
 * @param {string} path - Path endpoint tanpa query string.
 * @param {RequestOptions} options - Query params dan AbortSignal, opsional.
 * @returns {Promise<Blob>} Isi file sebagai Blob.
 * @throws {ApiError} Jika jaringan gagal atau server membalas error JSON.
 */
async function requestBlob(path: string, options?: RequestOptions): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path, options?.params), {
      credentials: 'same-origin',
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok || contentType.includes('application/json')) {
    throw toApiError(response, await parseJson(response), path);
  }

  return response.blob();
}

/**
 * Mengambil file biner lalu menyimpannya ke perangkat pengguna lewat anchor
 * sementara yang langsung dilepas setelah diklik.
 * @param {string} path - Path endpoint file biner.
 * @param {string} filename - Nama berkas yang diusulkan ke pengguna.
 * @param {RequestOptions} options - Query params dan AbortSignal, opsional.
 * @returns {Promise<void>} Selesai setelah unduhan dipicu dan object URL dilepas.
 * @throws {ApiError} Jika jaringan gagal atau server membalas error JSON.
 */
async function downloadBlob(path: string, filename: string, options?: RequestOptions) {
  const blob = await requestBlob(path, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Satu-satunya pintu keluar HTTP di sisi klien. Komponen tidak pernah menyentuh
 * `fetch`, `response.ok`, maupun `response.json()` secara langsung.
 */
export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  blob: (path: string, options?: RequestOptions) => requestBlob(path, options),
  download: (path: string, filename: string, options?: RequestOptions) => downloadBlob(path, filename, options),
};
