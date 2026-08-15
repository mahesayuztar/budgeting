import 'server-only';

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { formatAmountPlain } from '@/src/helpers/MoneyHelper';
import { formatDateShort } from '@/src/helpers/DateHelper';
import {
  A4_SIZE,
  Cursor,
  LINE_HEIGHT,
  MARGIN,
  MUTED_COLOR,
  NEGATIVE_COLOR,
  POSITIVE_COLOR,
  drawHeader,
  drawTableHead,
  truncate,
  type ReportColumns,
  type ReportFonts,
} from './ReportPdf';
import type { AccountBalanceHistoryRow, DebtHistoryRow, DebtPaymentHistoryRow, TransactionHistoryRow } from './ReportHistoryService';

const TRANSACTION_TYPE_LABEL: Record<TransactionHistoryRow['type'], string> = {
  INCOME: 'Masuk',
  EXPENSE: 'Keluar',
  TRANSFER: 'Transfer',
};

const DEBT_STATUS_LABEL: Record<DebtHistoryRow['status'], string> = {
  OPEN: 'Berjalan',
  PAID: 'Lunas',
};

type HistoryReportContext = {
  title: string;
  period: string;
  userName: string;
};

/**
 * Menyiapkan dokumen PDF baru beserta font dan kursornya, lalu menggambar
 * kepala laporan. Seluruh laporan riwayat memakai pembuka yang sama, jadi
 * langkah ini dikumpulkan di satu tempat.
 * @param {HistoryReportContext} context - Judul, label periode, dan nama pemilik laporan.
 * @returns {Promise<{ doc: PDFDocument; fonts: ReportFonts; cursor: Cursor }>} Dokumen, font, dan kursor yang siap diisi.
 */
async function startHistoryReport(context: HistoryReportContext) {
  const doc = await PDFDocument.create();

  const fonts: ReportFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cursor = new Cursor(doc, fonts);
  drawHeader(cursor, context.title, context.period, context.userName);

  return { doc, fonts, cursor };
}

/**
 * Menutup laporan dengan keterangan saat isinya kosong, lalu membubuhkan footer
 * pada seluruh halaman dan menghasilkan berkasnya.
 * @param {PDFDocument} doc - Dokumen PDF yang sudah terisi.
 * @param {Cursor} cursor - Kursor halaman yang dipakai menggambar.
 * @param {boolean} isEmpty - Tandai true bila tidak ada satu pun baris data.
 * @returns {Promise<Uint8Array>} Isi berkas PDF yang siap dikirim ke klien.
 */
async function finishHistoryReport(doc: PDFDocument, cursor: Cursor, isEmpty: boolean) {
  if (isEmpty) {
    cursor.text('Tidak ada data pada periode ini.', { size: 10, color: MUTED_COLOR });
    cursor.down();
  }

  cursor.stampFooters(new Date());
  return doc.save();
}

/**
 * Menyusun PDF riwayat saldo tiap akun: saldo awal periode, uang masuk, uang
 * keluar, dan saldo akhir periode.
 * @param {HistoryReportContext} context - Judul, label periode, dan nama pemilik laporan.
 * @param {AccountBalanceHistoryRow[]} rows - Baris riwayat saldo per akun.
 * @returns {Promise<Uint8Array>} Isi berkas PDF laporan saldo akun.
 */
export async function buildAccountBalanceHistoryPdf(context: HistoryReportContext, rows: AccountBalanceHistoryRow[]) {
  const { doc, fonts, cursor } = await startHistoryReport(context);

  const columns: ReportColumns = [
    { label: 'Akun', x: MARGIN, width: 130 },
    { label: 'Saldo Awal', x: MARGIN + 140, width: 90, align: 'right' },
    { label: 'Masuk', x: MARGIN + 240, width: 80, align: 'right' },
    { label: 'Keluar', x: MARGIN + 330, width: 80, align: 'right' },
    { label: 'Saldo Akhir', x: MARGIN + 420, width: A4_SIZE.width - MARGIN * 2 - 420, align: 'right' },
  ];

  drawTableHead(cursor, columns);

  for (const _row of rows) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));

    cursor.text(truncate(_row.name, fonts.regular, 9, columns[0].width), { x: columns[0].x, size: 9 });
    cursor.text(formatAmountPlain(_row.openingBalance), { x: columns[1].x, width: columns[1].width, align: 'right', size: 9 });
    cursor.text(formatAmountPlain(_row.incoming), { x: columns[2].x, width: columns[2].width, align: 'right', size: 9, color: POSITIVE_COLOR });
    cursor.text(formatAmountPlain(_row.outgoing), { x: columns[3].x, width: columns[3].width, align: 'right', size: 9, color: NEGATIVE_COLOR });
    cursor.text(formatAmountPlain(_row.closingBalance), { x: columns[4].x, width: columns[4].width, align: 'right', size: 9, bold: true });
    cursor.down();
  }

  return finishHistoryReport(doc, cursor, rows.length === 0);
}

/**
 * Menyusun PDF riwayat transaksi. Kolom akun menampilkan perpindahan sumber ke
 * tujuan untuk transaksi transfer, dan hanya akun tunggal untuk jenis lainnya.
 * @param {HistoryReportContext} context - Judul, label periode, dan nama pemilik laporan.
 * @param {TransactionHistoryRow[]} rows - Baris riwayat transaksi.
 * @returns {Promise<Uint8Array>} Isi berkas PDF laporan transaksi.
 */
export async function buildTransactionHistoryPdf(context: HistoryReportContext, rows: TransactionHistoryRow[]) {
  const { doc, fonts, cursor } = await startHistoryReport(context);

  const columns: ReportColumns = [
    { label: 'Tanggal', x: MARGIN, width: 60 },
    { label: 'Kategori', x: MARGIN + 66, width: 95 },
    { label: 'Akun', x: MARGIN + 167, width: 130 },
    { label: 'Catatan', x: MARGIN + 303, width: 95 },
    { label: 'Tipe', x: MARGIN + 404, width: 45 },
    { label: 'Jumlah', x: MARGIN + 452, width: A4_SIZE.width - MARGIN * 2 - 452, align: 'right' },
  ];

  drawTableHead(cursor, columns);

  for (const _row of rows) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));

    const accountLabel = _row.toAccountName ? `${_row.accountName} > ${_row.toAccountName}` : _row.accountName;

    cursor.text(formatDateShort(_row.occurredAt), { x: columns[0].x, size: 9 });
    cursor.text(truncate(_row.categoryName, fonts.regular, 9, columns[1].width), { x: columns[1].x, size: 9 });
    cursor.text(truncate(accountLabel, fonts.regular, 9, columns[2].width), { x: columns[2].x, size: 9 });
    cursor.text(truncate(_row.note ?? '-', fonts.regular, 9, columns[3].width), { x: columns[3].x, size: 9 });
    cursor.text(TRANSACTION_TYPE_LABEL[_row.type], {
      x: columns[4].x,
      size: 9,
      color: _row.type === 'INCOME' ? POSITIVE_COLOR : _row.type === 'EXPENSE' ? NEGATIVE_COLOR : MUTED_COLOR,
    });
    cursor.text(formatAmountPlain(_row.amount), { x: columns[5].x, width: columns[5].width, align: 'right', size: 9 });
    cursor.down();
  }

  return finishHistoryReport(doc, cursor, rows.length === 0);
}

/**
 * Menyusun PDF riwayat hutang atau piutang beserta jumlah terbayar, sisa, dan
 * statusnya. Dipakai untuk kedua jenis catatan karena bentuk kolomnya sama.
 * @param {HistoryReportContext} context - Judul, label periode, dan nama pemilik laporan.
 * @param {DebtHistoryRow[]} rows - Baris riwayat hutang atau piutang.
 * @returns {Promise<Uint8Array>} Isi berkas PDF laporan hutang atau piutang.
 */
export async function buildDebtHistoryPdf(context: HistoryReportContext, rows: DebtHistoryRow[]) {
  const { doc, fonts, cursor } = await startHistoryReport(context);

  const columns: ReportColumns = [
    { label: 'Tanggal', x: MARGIN, width: 60 },
    { label: 'Pihak', x: MARGIN + 66, width: 110 },
    { label: 'Jatuh Tempo', x: MARGIN + 182, width: 66 },
    { label: 'Nilai', x: MARGIN + 254, width: 78, align: 'right' },
    { label: 'Terbayar', x: MARGIN + 338, width: 78, align: 'right' },
    { label: 'Sisa', x: MARGIN + 422, width: 60, align: 'right' },
    { label: 'Status', x: MARGIN + 488, width: A4_SIZE.width - MARGIN * 2 - 488 },
  ];

  drawTableHead(cursor, columns);

  let totalAmount = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  for (const _row of rows) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));

    totalAmount += _row.amount;
    totalPaid += _row.paidAmount;
    totalRemaining += _row.remaining;

    cursor.text(formatDateShort(_row.date), { x: columns[0].x, size: 9 });
    cursor.text(truncate(_row.party, fonts.regular, 9, columns[1].width), { x: columns[1].x, size: 9 });
    cursor.text(_row.dueDate ? formatDateShort(_row.dueDate) : '-', { x: columns[2].x, size: 9 });
    cursor.text(formatAmountPlain(_row.amount), { x: columns[3].x, width: columns[3].width, align: 'right', size: 9 });
    cursor.text(formatAmountPlain(_row.paidAmount), { x: columns[4].x, width: columns[4].width, align: 'right', size: 9, color: POSITIVE_COLOR });
    cursor.text(formatAmountPlain(_row.remaining), { x: columns[5].x, width: columns[5].width, align: 'right', size: 9, bold: true });
    cursor.text(DEBT_STATUS_LABEL[_row.status], { x: columns[6].x, size: 9, color: _row.status === 'PAID' ? POSITIVE_COLOR : MUTED_COLOR });
    cursor.down();
  }

  if (rows.length > 0) {
    cursor.ensure(LINE_HEIGHT * 2);
    cursor.down(4);
    cursor.rule();
    cursor.down(LINE_HEIGHT);
    cursor.text('Total', { x: columns[0].x, size: 9, bold: true });
    cursor.text(formatAmountPlain(totalAmount), { x: columns[3].x, width: columns[3].width, align: 'right', size: 9, bold: true });
    cursor.text(formatAmountPlain(totalPaid), { x: columns[4].x, width: columns[4].width, align: 'right', size: 9, bold: true });
    cursor.text(formatAmountPlain(totalRemaining), { x: columns[5].x, width: columns[5].width, align: 'right', size: 9, bold: true });
  }

  return finishHistoryReport(doc, cursor, rows.length === 0);
}

/**
 * Menyusun PDF riwayat pembayaran hutang atau piutang beserta totalnya. Dipakai
 * untuk kedua jenis catatan karena bentuk kolomnya sama.
 * @param {HistoryReportContext} context - Judul, label periode, dan nama pemilik laporan.
 * @param {DebtPaymentHistoryRow[]} rows - Baris riwayat pembayaran.
 * @returns {Promise<Uint8Array>} Isi berkas PDF laporan pembayaran.
 */
export async function buildDebtPaymentHistoryPdf(context: HistoryReportContext, rows: DebtPaymentHistoryRow[]) {
  const { doc, fonts, cursor } = await startHistoryReport(context);

  const columns: ReportColumns = [
    { label: 'Tanggal Bayar', x: MARGIN, width: 80 },
    { label: 'Pihak', x: MARGIN + 90, width: 150 },
    { label: 'Catatan', x: MARGIN + 250, width: 160 },
    { label: 'Jumlah', x: MARGIN + 420, width: A4_SIZE.width - MARGIN * 2 - 420, align: 'right' },
  ];

  drawTableHead(cursor, columns);

  let total = 0;

  for (const _row of rows) {
    cursor.ensure(LINE_HEIGHT, () => drawTableHead(cursor, columns));
    total += _row.amount;

    cursor.text(formatDateShort(_row.paidAt), { x: columns[0].x, size: 9 });
    cursor.text(truncate(_row.party, fonts.regular, 9, columns[1].width), { x: columns[1].x, size: 9 });
    cursor.text(truncate(_row.note ?? '-', fonts.regular, 9, columns[2].width), { x: columns[2].x, size: 9 });
    cursor.text(formatAmountPlain(_row.amount), { x: columns[3].x, width: columns[3].width, align: 'right', size: 9 });
    cursor.down();
  }

  if (rows.length > 0) {
    cursor.ensure(LINE_HEIGHT * 2);
    cursor.down(4);
    cursor.rule();
    cursor.down(LINE_HEIGHT);
    cursor.text('Total', { x: columns[0].x, size: 9, bold: true });
    cursor.text(formatAmountPlain(total), { x: columns[3].x, width: columns[3].width, align: 'right', size: 9, bold: true });
  }

  return finishHistoryReport(doc, cursor, rows.length === 0);
}
