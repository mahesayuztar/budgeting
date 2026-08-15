import 'server-only';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatAmountPlain } from '@/src/helpers/MoneyHelper';
import { dateRangeLabel, formatDateShort, MONTH_NAMES_ID, monthLabel } from '@/src/helpers/DateHelper';
import type { TransactionDTO } from '@/src/lib/transactions/TransactionService';
import type { MonthlySummary, PeriodSummary, WeeklySummary, YearlySummary } from './ReportService';

export const A4_SIZE = { width: 595.28, height: 841.89 };
export const MARGIN = 40;
export const LINE_HEIGHT = 16;

const INK_COLOR = rgb(0.13, 0.13, 0.15);
export const MUTED_COLOR = rgb(0.45, 0.45, 0.5);
const RULE_COLOR = rgb(0.85, 0.85, 0.88);
export const POSITIVE_COLOR = rgb(0.18, 0.5, 0.28);
export const NEGATIVE_COLOR = rgb(0.7, 0.24, 0.24);
const PANEL_COLOR = rgb(0.98, 0.96, 0.88);

export type ReportFonts = { regular: PDFFont; bold: PDFFont };

export type ReportColumns = { label: string; x: number; width: number; align?: 'right' }[];

type ReportTextOptions = {
  x?: number;
  size?: number;
  bold?: boolean;
  color?: ReturnType<typeof rgb>;
  width?: number;
  align?: 'right';
};

type ReportSummaryRow = { label: string; value: number; tone?: 'auto' };

type PeriodReportData = {
  userName: string;
  title: string;
  periodLabel: string;
  summary: PeriodSummary;
  transactions: TransactionDTO[];
};

export type MonthlyReportData = {
  userName: string;
  summary: MonthlySummary;
  transactions: TransactionDTO[];
};

export type WeeklyReportData = {
  userName: string;
  summary: WeeklySummary;
  transactions: TransactionDTO[];
};

export type YearlyReportData = {
  userName: string;
  summary: YearlySummary;
};

/**
 * Membersihkan teks agar aman digambar dengan StandardFonts, yang hanya
 * mendukung WinAnsi. Karakter di luar rentang itu, misalnya tanda hubung
 * panjang hasil salin-tempel, akan membuat `save()` melempar error.
 * @param {string} value - Teks mentah dari data pengguna.
 * @returns {string} Teks yang seluruh karakternya berada dalam rentang WinAnsi.
 */
function sanitize(value: string) {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/**
 * Memotong teks yang melebihi lebar kolom dan menambahkan elipsis di ujungnya.
 * @param {string} value - Teks yang akan digambar.
 * @param {PDFFont} font - Font yang dipakai menggambar teks.
 * @param {number} size - Ukuran font dalam poin.
 * @param {number} max - Lebar maksimum kolom dalam poin.
 * @returns {string} Teks utuh bila muat, atau versi terpotong berakhiran elipsis.
 */
export function truncate(value: string, font: PDFFont, size: number, max: number) {
  const safeValue = sanitize(value);
  if (font.widthOfTextAtSize(safeValue, size) <= max) return safeValue;

  let result = safeValue;

  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > max) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
}

/**
 * Kursor halaman PDF. pdf-lib tidak mengenal konsep aliran teks, sehingga
 * posisi Y, penggambaran teks, dan pemecahan halaman diurus manual lewat kelas
 * ini.
 * @param {PDFDocument} doc - Dokumen PDF yang sedang disusun.
 * @param {ReportFonts} fonts - Pasangan font reguler dan tebal yang sudah di-embed.
 * @returns {Cursor} Kursor yang sudah berada di halaman pertama.
 */
export class Cursor {
  page: PDFPage;
  y: number;

  private readonly doc: PDFDocument;
  private readonly fonts: ReportFonts;
  private readonly pages: PDFPage[] = [];

  constructor(doc: PDFDocument, fonts: ReportFonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = this.newPage();
    this.y = A4_SIZE.height - MARGIN;
  }

  /**
   * Menambahkan halaman A4 baru ke dokumen dan mencatatnya untuk penomoran
   * footer di akhir penyusunan.
   * @returns {PDFPage} Halaman baru yang siap digambari.
   */
  private newPage() {
    const page = this.doc.addPage([A4_SIZE.width, A4_SIZE.height]);
    this.pages.push(page);
    return page;
  }

  /**
   * Memastikan sisa ruang halaman masih cukup, dan berpindah ke halaman baru
   * bila tidak.
   * @param {number} needed - Tinggi ruang yang dibutuhkan dalam poin.
   * @param {() => void} onNewPage - Dijalankan setelah pindah halaman, biasanya untuk menggambar ulang kepala tabel.
   * @returns {void}
   */
  ensure(needed: number, onNewPage?: () => void) {
    if (this.y - needed >= MARGIN + 24) return;

    this.page = this.newPage();
    this.y = A4_SIZE.height - MARGIN;
    onNewPage?.();
  }

  /**
   * Menggambar satu potong teks pada posisi Y kursor saat ini.
   * @param {string} value - Teks yang digambar, akan dibersihkan lebih dulu.
   * @param {ReportTextOptions} options - Posisi, ukuran, ketebalan, warna, lebar kolom, dan perataan teks.
   * @returns {void}
   */
  text(value: string, options: ReportTextOptions = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const safeValue = sanitize(value);
    const x = options.align === 'right' && options.width !== undefined ? (options.x ?? MARGIN) + options.width - font.widthOfTextAtSize(safeValue, size) : (options.x ?? MARGIN);

    this.page.drawText(safeValue, {
      x,
      y: this.y,
      size,
      font,
      color: options.color ?? INK_COLOR,
    });
  }

  /**
   * Menurunkan posisi kursor sejauh jarak tertentu.
   * @param {number} amount - Jarak turun dalam poin, default satu tinggi baris.
   * @returns {void}
   */
  down(amount = LINE_HEIGHT) {
    this.y -= amount;
  }

  /**
   * Menggambar garis pemisah horizontal selebar area cetak.
   * @returns {void}
   */
  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4_SIZE.width - MARGIN, y: this.y },
      thickness: 0.5,
      color: RULE_COLOR,
    });
  }

  /**
   * Menggambar footer berisi waktu pembuatan dan nomor halaman pada seluruh
   * halaman. Dipanggil paling akhir karena jumlah halaman baru diketahui
   * setelah seluruh isi tergambar.
   * @param {Date} generatedAt - Waktu laporan dibuat.
   * @returns {void}
   */
  stampFooters(generatedAt: Date) {
    const totalPages = this.pages.length;
    const hours = generatedAt.getHours().toString().padStart(2, '0');
    const minutes = generatedAt.getMinutes().toString().padStart(2, '0');
    const stamp = `Dibuat ${formatDateShort(generatedAt)} ${hours}:${minutes}`;

    this.pages.forEach((_page, _index) => {
      _page.drawText(sanitize(stamp), {
        x: MARGIN,
        y: MARGIN - 12,
        size: 8,
        font: this.fonts.regular,
        color: MUTED_COLOR,
      });

      const label = `Halaman ${_index + 1} dari ${totalPages}`;

      _page.drawText(label, {
        x: A4_SIZE.width - MARGIN - this.fonts.regular.widthOfTextAtSize(label, 8),
        y: MARGIN - 12,
        size: 8,
        font: this.fonts.regular,
        color: MUTED_COLOR,
      });
    });
  }
}

/**
 * Menggambar kepala laporan: judul, periode, pemilik, dan garis pemisahnya.
 * @param {Cursor} cursor - Kursor halaman yang sedang aktif.
 * @param {string} title - Judul laporan, misalnya `Ringkasan Bulanan`.
 * @param {string} period - Label periode laporan, misalnya `Agustus 2026`.
 * @param {string} userName - Nama pemilik laporan.
 * @returns {void}
 */
export function drawHeader(cursor: Cursor, title: string, period: string, userName: string) {
  cursor.text('Laporan Keuangan', { size: 18, bold: true });
  cursor.down(20);
  cursor.text(title, { size: 12, bold: true });
  cursor.down(14);
  cursor.text(`Periode: ${period}`, { size: 10, color: MUTED_COLOR });
  cursor.down(12);
  cursor.text(`Pemilik: ${userName}`, { size: 10, color: MUTED_COLOR });
  cursor.down(14);
  cursor.rule();
  cursor.down(20);
}

/**
 * Menggambar panel ringkasan berlatar warna berisi pasangan label dan nilai.
 * Baris bertanda `auto` diwarnai merah bila nilainya negatif dan hijau bila
 * tidak.
 * @param {Cursor} cursor - Kursor halaman yang sedang aktif.
 * @param {ReportSummaryRow[]} rows - Baris ringkasan yang digambar berurutan.
 * @returns {void}
 */
function drawSummaryPanel(cursor: Cursor, rows: ReportSummaryRow[]) {
  const height = 12 + rows.length * LINE_HEIGHT;

  cursor.page.drawRectangle({
    x: MARGIN,
    y: cursor.y - height + LINE_HEIGHT,
    width: A4_SIZE.width - MARGIN * 2,
    height,
    color: PANEL_COLOR,
  });

  cursor.down(-2);

  for (const _row of rows) {
    cursor.text(_row.label, { x: MARGIN + 12, size: 10 });
    cursor.text(formatAmountPlain(_row.value), {
      x: MARGIN + 12,
      width: A4_SIZE.width - MARGIN * 2 - 24,
      align: 'right',
      size: 10,
      bold: true,
      color: _row.tone === 'auto' ? (_row.value < 0 ? NEGATIVE_COLOR : POSITIVE_COLOR) : INK_COLOR,
    });
    cursor.down();
  }

  cursor.down(30);
}

/**
 * Menggambar kepala tabel beserta garis pemisahnya. Dipakai ulang saat tabel
 * berpindah halaman supaya pembaca tidak kehilangan nama kolom.
 * @param {Cursor} cursor - Kursor halaman yang sedang aktif.
 * @param {ReportColumns} columns - Definisi kolom tabel.
 * @returns {void}
 */
export function drawTableHead(cursor: Cursor, columns: ReportColumns) {
  for (const _column of columns) {
    cursor.text(_column.label, {
      x: _column.x,
      width: _column.width,
      align: _column.align,
      size: 9,
      bold: true,
      color: MUTED_COLOR,
    });
  }

  cursor.down(6);
  cursor.rule();
  cursor.down(LINE_HEIGHT);
}

/**
 * Menyusun berkas PDF laporan satu periode: ringkasan nilai, rincian
 * pengeluaran per kategori, dan tabel seluruh transaksinya. Tata letaknya
 * sama untuk setiap periode yang isinya berupa daftar transaksi, sehingga
 * laporan bulanan dan mingguan cukup membedakan judul serta label periodenya.
 * @param {PeriodReportData} data - Data laporan satu periode.
 * @param {string} data.userName - Nama pemilik laporan.
 * @param {string} data.title - Judul laporan yang dicetak di kepala dokumen.
 * @param {string} data.periodLabel - Label periode laporan yang dicetak di kepala dokumen.
 * @param {PeriodSummary} data.summary - Ringkasan nilai periode tersebut.
 * @param {TransactionDTO[]} data.transactions - Seluruh transaksi pada periode tersebut.
 * @returns {Promise<Uint8Array>} Isi berkas PDF yang siap dikirim ke klien.
 */
async function buildPeriodReportPdf(data: PeriodReportData) {
  const doc = await PDFDocument.create();

  const fonts: ReportFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cursor = new Cursor(doc, fonts);
  const { summary, transactions } = data;

  drawHeader(cursor, data.title, data.periodLabel, data.userName);

  drawSummaryPanel(cursor, [
    { label: 'Total Pemasukan', value: summary.income },
    { label: 'Total Pengeluaran', value: summary.expense },
    { label: 'Selisih', value: summary.net, tone: 'auto' },
  ]);

  if (summary.expenseByCategory.length > 0) {
    cursor.text('Pengeluaran per Kategori', { size: 11, bold: true });
    cursor.down(18);

    for (const _item of summary.expenseByCategory) {
      cursor.ensure(LINE_HEIGHT);
      cursor.text(truncate(_item.name, fonts.regular, 10, 260), { size: 10 });
      cursor.text(`${Math.round(_item.share * 100)}%`, {
        x: 330,
        width: 40,
        align: 'right',
        size: 10,
        color: MUTED_COLOR,
      });
      cursor.text(formatAmountPlain(_item.total), {
        x: MARGIN,
        width: A4_SIZE.width - MARGIN * 2,
        align: 'right',
        size: 10,
      });
      cursor.down();
    }

    cursor.down(14);
  }

  const columns: ReportColumns = [
    { label: 'Tanggal', x: MARGIN, width: 64 },
    { label: 'Kategori', x: MARGIN + 70, width: 105 },
    { label: 'Catatan', x: MARGIN + 180, width: 145 },
    { label: 'Tipe', x: MARGIN + 335, width: 45 },
    { label: 'Jumlah', x: MARGIN + 385, width: A4_SIZE.width - MARGIN * 2 - 385, align: 'right' },
  ];

  cursor.ensure(60);
  cursor.text('Rincian Transaksi', { size: 11, bold: true });
  cursor.down(18);
  drawTableHead(cursor, columns);

  if (transactions.length === 0) {
    cursor.text('Belum ada transaksi pada periode ini.', { size: 10, color: MUTED_COLOR });
    cursor.down();
  }

  for (const _transaction of transactions) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));

    cursor.text(formatDateShort(_transaction.occurredAt), { x: columns[0].x, size: 9 });
    cursor.text(truncate(_transaction.category?.name ?? 'Tanpa Kategori', fonts.regular, 9, columns[1].width), { x: columns[1].x, size: 9 });
    cursor.text(truncate(_transaction.note ?? '-', fonts.regular, 9, columns[2].width), { x: columns[2].x, size: 9 });
    cursor.text(_transaction.type === 'INCOME' ? 'Masuk' : 'Keluar', {
      x: columns[3].x,
      size: 9,
      color: _transaction.type === 'INCOME' ? POSITIVE_COLOR : NEGATIVE_COLOR,
    });
    cursor.text(formatAmountPlain(_transaction.amount), {
      x: columns[4].x,
      width: columns[4].width,
      align: 'right',
      size: 9,
    });
    cursor.down();
  }

  cursor.stampFooters(new Date());
  return doc.save();
}

/**
 * Menyusun berkas PDF laporan bulanan.
 * @param {MonthlyReportData} data - Data laporan bulanan.
 * @param {string} data.userName - Nama pemilik laporan.
 * @param {MonthlySummary} data.summary - Ringkasan nilai bulan tersebut.
 * @param {TransactionDTO[]} data.transactions - Seluruh transaksi pada bulan tersebut.
 * @returns {Promise<Uint8Array>} Isi berkas PDF yang siap dikirim ke klien.
 */
export async function buildMonthlyReportPdf(data: MonthlyReportData) {
  return buildPeriodReportPdf({
    userName: data.userName,
    title: 'Ringkasan Bulanan',
    periodLabel: monthLabel(data.summary.year, data.summary.month),
    summary: data.summary,
    transactions: data.transactions,
  });
}

/**
 * Menyusun berkas PDF laporan mingguan berisi tujuh hari terakhir.
 * @param {WeeklyReportData} data - Data laporan mingguan.
 * @param {string} data.userName - Nama pemilik laporan.
 * @param {WeeklySummary} data.summary - Ringkasan nilai rentang tujuh hari tersebut.
 * @param {TransactionDTO[]} data.transactions - Seluruh transaksi pada rentang tersebut.
 * @returns {Promise<Uint8Array>} Isi berkas PDF yang siap dikirim ke klien.
 */
export async function buildWeeklyReportPdf(data: WeeklyReportData) {
  return buildPeriodReportPdf({
    userName: data.userName,
    title: 'Ringkasan Mingguan',
    periodLabel: dateRangeLabel(data.summary.startDate, data.summary.endDate),
    summary: data.summary,
    transactions: data.transactions,
  });
}

/**
 * Menyusun berkas PDF laporan tahunan: ringkasan nilai setahun dan rekap
 * pemasukan, pengeluaran, serta selisihnya per bulan.
 * @param {YearlyReportData} data - Data laporan tahunan.
 * @param {string} data.userName - Nama pemilik laporan.
 * @param {YearlySummary} data.summary - Ringkasan nilai setahun beserta titik data tiap bulan.
 * @returns {Promise<Uint8Array>} Isi berkas PDF yang siap dikirim ke klien.
 */
export async function buildYearlyReportPdf(data: YearlyReportData) {
  const doc = await PDFDocument.create();

  const fonts: ReportFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cursor = new Cursor(doc, fonts);
  const { summary } = data;

  drawHeader(cursor, 'Ringkasan Tahunan', String(summary.year), data.userName);

  drawSummaryPanel(cursor, [
    { label: 'Total Pemasukan', value: summary.income },
    { label: 'Total Pengeluaran', value: summary.expense },
    { label: 'Selisih', value: summary.net, tone: 'auto' },
  ]);

  const columns: ReportColumns = [
    { label: 'Bulan', x: MARGIN, width: 120 },
    { label: 'Pemasukan', x: MARGIN + 130, width: 120, align: 'right' },
    { label: 'Pengeluaran', x: MARGIN + 260, width: 120, align: 'right' },
    { label: 'Selisih', x: MARGIN + 390, width: A4_SIZE.width - MARGIN * 2 - 390, align: 'right' },
  ];

  cursor.text('Rekap per Bulan', { size: 11, bold: true });
  cursor.down(18);
  drawTableHead(cursor, columns);

  for (const _point of summary.months) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));

    cursor.text(MONTH_NAMES_ID[_point.month - 1], { x: columns[0].x, size: 9 });
    cursor.text(formatAmountPlain(_point.income), { x: columns[1].x, width: columns[1].width, align: 'right', size: 9 });
    cursor.text(formatAmountPlain(_point.expense), { x: columns[2].x, width: columns[2].width, align: 'right', size: 9 });
    cursor.text(formatAmountPlain(_point.net), {
      x: columns[3].x,
      width: columns[3].width,
      align: 'right',
      size: 9,
      color: _point.net < 0 ? NEGATIVE_COLOR : POSITIVE_COLOR,
    });
    cursor.down();
  }

  cursor.down(6);
  cursor.rule();
  cursor.down(LINE_HEIGHT);
  cursor.text('Total', { x: columns[0].x, size: 9, bold: true });
  cursor.text(formatAmountPlain(summary.income), { x: columns[1].x, width: columns[1].width, align: 'right', size: 9, bold: true });
  cursor.text(formatAmountPlain(summary.expense), { x: columns[2].x, width: columns[2].width, align: 'right', size: 9, bold: true });
  cursor.text(formatAmountPlain(summary.net), {
    x: columns[3].x,
    width: columns[3].width,
    align: 'right',
    size: 9,
    bold: true,
    color: summary.net < 0 ? NEGATIVE_COLOR : POSITIVE_COLOR,
  });

  cursor.stampFooters(new Date());
  return doc.save();
}
