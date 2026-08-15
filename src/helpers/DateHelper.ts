export type PeriodScope = 'monthly' | 'weekly';

export const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] as const;

/**
 * Menyusun rentang tanggal satu bulan penuh. Kolom tanggal disimpan sebagai
 * `@db.Date` pada UTC midnight, jadi rentangnya dibangun dengan `Date.UTC`
 * supaya tidak bergeser mengikuti timezone server.
 * @param {number} year - Tahun periode, misalnya 2026.
 * @param {number} month - Bulan periode dengan Januari bernilai 1.
 * @returns {{ start: Date; end: Date }} Awal bulan inklusif dan awal bulan berikutnya sebagai batas eksklusif.
 */
export function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Menyusun rentang tanggal satu tahun penuh pada UTC.
 * @param {number} year - Tahun periode, misalnya 2026.
 * @returns {{ start: Date; end: Date }} Awal tahun inklusif dan awal tahun berikutnya sebagai batas eksklusif.
 */
export function yearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/**
 * Menyusun rentang tujuh hari terakhir yang berakhir pada tanggal acuan dan
 * ikut menghitung tanggal acuan itu sendiri. Rentangnya dibangun pada UTC agar
 * sejajar dengan kolom `@db.Date` yang disimpan pada UTC midnight.
 * @param {string | Date} reference - Tanggal acuan berupa objek Date atau teks `YYYY-MM-DD`.
 * @returns {{ start: Date; end: Date }} Enam hari sebelum acuan sebagai batas inklusif dan sehari setelah acuan sebagai batas eksklusif.
 */
export function weekRange(reference: string | Date) {
  const anchor = toDateOnly(reference);

  return {
    start: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - 6)),
    end: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + 1)),
  };
}

/**
 * Menyusun label periode bulan dalam bahasa Indonesia.
 * @param {number} year - Tahun periode, misalnya 2026.
 * @param {number} month - Bulan periode dengan Januari bernilai 1.
 * @returns {string} Label periode, misalnya `Agustus 2026`.
 */
export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}

/**
 * Menyusun label rentang tanggal dalam bahasa Indonesia. Kedua batasnya
 * inklusif, jadi pemanggil yang memegang batas akhir eksklusif perlu
 * mengurangi satu hari lebih dulu.
 * @param {string | Date} startDate - Tanggal awal rentang.
 * @param {string | Date} endDate - Tanggal akhir rentang.
 * @returns {string} Label rentang, misalnya `09 Agu 2026 - 15 Agu 2026`.
 */
export function dateRangeLabel(startDate: string | Date, endDate: string | Date) {
  return `${formatDateID(startDate)} - ${formatDateID(endDate)}`;
}

/**
 * Menyusun label rentang tujuh hari terakhir yang berakhir pada tanggal acuan.
 * @param {string | Date} reference - Tanggal acuan akhir rentang.
 * @returns {string} Label rentang, misalnya `09 Agu 2026 - 15 Agu 2026`.
 */
export function weekLabel(reference: string | Date) {
  return dateRangeLabel(weekRange(reference).start, reference);
}

/**
 * Memformat tanggal ke gaya Indonesia dengan nama bulan singkat.
 * @param {Date | string} value - Tanggal berupa objek Date atau teks ISO.
 * @returns {string} Tanggal terformat, misalnya `15 Agu 2026`.
 */
export function formatDateID(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Memformat tanggal ke bentuk numerik ringkas untuk kolom tabel sempit.
 * @param {Date | string} value - Tanggal berupa objek Date atau teks ISO.
 * @returns {string} Tanggal terformat, misalnya `15/08/2026`.
 */
export function formatDateShort(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Mengubah nilai tanggal menjadi Date pada UTC midnight, bentuk yang cocok
 * disimpan ke kolom bertipe `@db.Date`.
 * @param {string | Date} value - Tanggal berupa objek Date atau teks `YYYY-MM-DD`.
 * @returns {Date} Tanggal pada UTC midnight.
 */
export function toDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Mengubah tanggal menjadi teks `YYYY-MM-DD` yang dipakai `<input type="date">`.
 * @param {Date | string} value - Tanggal berupa objek Date atau teks ISO.
 * @returns {string} Tanggal dalam format `YYYY-MM-DD`.
 */
export function toDateInputValue(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

/**
 * Mengambil periode bulan dan tahun yang sedang berjalan menurut UTC.
 * @returns {{ year: number; month: number }} Tahun dan bulan berjalan dengan Januari bernilai 1.
 */
export function currentPeriod() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/**
 * Menerjemahkan tahun dan bulan dari query string menjadi periode yang sah.
 * Nilai yang hilang, bukan angka, atau di luar rentang wajar diganti dengan
 * periode berjalan, sehingga halaman tidak pernah dirender dengan periode yang
 * tidak masuk akal.
 * @param {{ year?: string; month?: string }} rawPeriod - Nilai tahun dan bulan mentah dari query string.
 * @param {string} rawPeriod.year - Tahun dari query string, opsional.
 * @param {string} rawPeriod.month - Bulan dari query string, opsional.
 * @returns {{ year: number; month: number }} Periode yang sudah dipastikan berada dalam rentang wajar.
 */
export function resolvePeriod(rawPeriod: { year?: string; month?: string }) {
  const fallback = currentPeriod();
  const year = Number(rawPeriod.year);
  const month = Number(rawPeriod.month);

  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
  };
}

/**
 * Memformat nama hari dalam bentuk singkat berbahasa Indonesia.
 * @param {Date | string} value - Tanggal berupa objek Date atau teks ISO.
 * @returns {string} Nama hari singkat, misalnya `Sab`.
 */
export function formatWeekdayShortID(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Menerjemahkan cakupan periode dari query string menjadi nilai yang sah.
 * Nilai yang tidak dikenali dianggap bulanan, sehingga halaman tidak pernah
 * dirender dengan cakupan yang tidak ada penanganannya.
 * @param {string} rawScope - Cakupan periode mentah dari query string, opsional.
 * @returns {PeriodScope} Cakupan periode yang sudah dipastikan sah.
 */
export function resolveScope(rawScope?: string): PeriodScope {
  return rawScope === 'weekly' ? 'weekly' : 'monthly';
}
