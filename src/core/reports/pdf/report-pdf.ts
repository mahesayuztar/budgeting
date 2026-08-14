import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatAmountPlain } from "@/src/core/lib/money";
import { formatDateShort, MONTH_NAMES_ID, monthLabel } from "@/src/core/lib/date";
import type { TransactionDTO } from "@/src/core/transactions/services/transaction.service";
import type {
  MonthlySummary,
  YearlySummary,
} from "@/src/core/reports/services/report.service";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const LINE = 16;

const INK = rgb(0.13, 0.13, 0.15);
const MUTED = rgb(0.45, 0.45, 0.5);
const RULE = rgb(0.85, 0.85, 0.88);
const POSITIVE = rgb(0.18, 0.5, 0.28);
const NEGATIVE = rgb(0.7, 0.24, 0.24);
const PANEL = rgb(0.98, 0.96, 0.88);

type Fonts = { regular: PDFFont; bold: PDFFont };

type Columns = { label: string; x: number; width: number; align?: "right" }[];

/**
 * Kursor halaman: pdf-lib tidak punya konsep aliran teks, jadi posisi Y dan
 * pemecahan halaman diurus manual di sini.
 */
class Cursor {
  page: PDFPage;
  y: number;

  private readonly doc: PDFDocument;
  private readonly fonts: Fonts;
  private readonly pages: PDFPage[] = [];

  constructor(doc: PDFDocument, fonts: Fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = this.newPage();
    this.y = A4.height - MARGIN;
  }

  private newPage() {
    const page = this.doc.addPage([A4.width, A4.height]);
    this.pages.push(page);
    return page;
  }

  /** Pindah halaman bila sisa ruang kurang dari `needed`. */
  ensure(needed: number, onNewPage?: () => void) {
    if (this.y - needed >= MARGIN + 24) return;
    this.page = this.newPage();
    this.y = A4.height - MARGIN;
    onNewPage?.();
  }

  text(
    value: string,
    options: {
      x?: number;
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      width?: number;
      align?: "right";
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const safe = sanitize(value);
    const x =
      options.align === "right" && options.width !== undefined
        ? (options.x ?? MARGIN) + options.width - font.widthOfTextAtSize(safe, size)
        : (options.x ?? MARGIN);

    this.page.drawText(safe, { x, y: this.y, size, font, color: options.color ?? INK });
  }

  down(amount = LINE) {
    this.y -= amount;
  }

  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4.width - MARGIN, y: this.y },
      thickness: 0.5,
      color: RULE,
    });
  }

  stampFooters(generatedAt: Date) {
    const total = this.pages.length;
    const stamp = `Dibuat ${formatDateShort(generatedAt)} ${generatedAt
      .getHours()
      .toString()
      .padStart(2, "0")}:${generatedAt.getMinutes().toString().padStart(2, "0")}`;

    this.pages.forEach((page, index) => {
      page.drawText(sanitize(stamp), {
        x: MARGIN,
        y: MARGIN - 12,
        size: 8,
        font: this.fonts.regular,
        color: MUTED,
      });

      const label = `Halaman ${index + 1} dari ${total}`;
      page.drawText(label, {
        x: A4.width - MARGIN - this.fonts.regular.widthOfTextAtSize(label, 8),
        y: MARGIN - 12,
        size: 8,
        font: this.fonts.regular,
        color: MUTED,
      });
    });
  }
}

/**
 * StandardFonts hanya mendukung WinAnsi. Karakter di luar itu (mis. tanda
 * hubung panjang hasil salin-tempel) akan melempar saat `save()`.
 */
function sanitize(value: string) {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function truncate(value: string, font: PDFFont, size: number, max: number) {
  const safe = sanitize(value);
  if (font.widthOfTextAtSize(safe, size) <= max) return safe;

  let result = safe;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > max) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function drawHeader(cursor: Cursor, title: string, period: string, userName: string) {
  cursor.text("Laporan Keuangan", { size: 18, bold: true });
  cursor.down(20);
  cursor.text(title, { size: 12, bold: true });
  cursor.down(14);
  cursor.text(`Periode: ${period}`, { size: 10, color: MUTED });
  cursor.down(12);
  cursor.text(`Pemilik: ${userName}`, { size: 10, color: MUTED });
  cursor.down(14);
  cursor.rule();
  cursor.down(20);
}

function drawSummaryPanel(
  cursor: Cursor,
  rows: { label: string; value: number; tone?: "auto" }[],
) {
  const height = 24 + rows.length * LINE;
  cursor.page.drawRectangle({
    x: MARGIN,
    y: cursor.y - height + LINE,
    width: A4.width - MARGIN * 2,
    height,
    color: PANEL,
  });

  cursor.down(-2);
  for (const row of rows) {
    cursor.text(row.label, { x: MARGIN + 12, size: 10 });
    cursor.text(formatAmountPlain(row.value), {
      x: MARGIN + 12,
      width: A4.width - MARGIN * 2 - 24,
      align: "right",
      size: 10,
      bold: true,
      color: row.tone === "auto" ? (row.value < 0 ? NEGATIVE : POSITIVE) : INK,
    });
    cursor.down();
  }
  cursor.down(16);
}

function drawTableHead(cursor: Cursor, columns: Columns) {
  for (const column of columns) {
    cursor.text(column.label, {
      x: column.x,
      width: column.width,
      align: column.align,
      size: 9,
      bold: true,
      color: MUTED,
    });
  }
  cursor.down(6);
  cursor.rule();
  cursor.down(LINE);
}

export type MonthlyReportData = {
  userName: string;
  summary: MonthlySummary;
  transactions: TransactionDTO[];
};

export async function buildMonthlyReportPdf(data: MonthlyReportData) {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cursor = new Cursor(doc, fonts);
  const { summary, transactions } = data;

  drawHeader(
    cursor,
    "Ringkasan Bulanan",
    monthLabel(summary.year, summary.month),
    data.userName,
  );

  drawSummaryPanel(cursor, [
    { label: "Total Pemasukan", value: summary.income },
    { label: "Total Pengeluaran", value: summary.expense },
    { label: "Selisih", value: summary.net, tone: "auto" },
  ]);

  if (summary.expenseByCategory.length > 0) {
    cursor.text("Pengeluaran per Kategori", { size: 11, bold: true });
    cursor.down(18);

    for (const item of summary.expenseByCategory) {
      cursor.ensure(LINE);
      cursor.text(truncate(item.name, fonts.regular, 10, 260), { size: 10 });
      cursor.text(`${Math.round(item.share * 100)}%`, {
        x: 330,
        width: 40,
        align: "right",
        size: 10,
        color: MUTED,
      });
      cursor.text(formatAmountPlain(item.total), {
        x: MARGIN,
        width: A4.width - MARGIN * 2,
        align: "right",
        size: 10,
      });
      cursor.down();
    }
    cursor.down(14);
  }

  const columns: Columns = [
    { label: "Tanggal", x: MARGIN, width: 64 },
    { label: "Kategori", x: MARGIN + 70, width: 105 },
    { label: "Catatan", x: MARGIN + 180, width: 145 },
    { label: "Tipe", x: MARGIN + 335, width: 45 },
    { label: "Jumlah", x: MARGIN + 385, width: A4.width - MARGIN * 2 - 385, align: "right" },
  ];

  cursor.ensure(60);
  cursor.text("Rincian Transaksi", { size: 11, bold: true });
  cursor.down(18);
  drawTableHead(cursor, columns);

  if (transactions.length === 0) {
    cursor.text("Belum ada transaksi pada periode ini.", { size: 10, color: MUTED });
    cursor.down();
  }

  for (const transaction of transactions) {
    cursor.ensure(LINE, () => drawTableHead(cursor, columns));

    cursor.text(formatDateShort(transaction.occurredAt), { x: columns[0].x, size: 9 });
    cursor.text(
      truncate(transaction.category?.name ?? "Tanpa Kategori", fonts.regular, 9, columns[1].width),
      { x: columns[1].x, size: 9 },
    );
    cursor.text(truncate(transaction.note ?? "-", fonts.regular, 9, columns[2].width), {
      x: columns[2].x,
      size: 9,
    });
    cursor.text(transaction.type === "INCOME" ? "Masuk" : "Keluar", {
      x: columns[3].x,
      size: 9,
      color: transaction.type === "INCOME" ? POSITIVE : NEGATIVE,
    });
    cursor.text(formatAmountPlain(transaction.amount), {
      x: columns[4].x,
      width: columns[4].width,
      align: "right",
      size: 9,
    });
    cursor.down();
  }

  cursor.stampFooters(new Date());
  return doc.save();
}

export type YearlyReportData = {
  userName: string;
  summary: YearlySummary;
};

export async function buildYearlyReportPdf(data: YearlyReportData) {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cursor = new Cursor(doc, fonts);
  const { summary } = data;

  drawHeader(cursor, "Ringkasan Tahunan", String(summary.year), data.userName);

  drawSummaryPanel(cursor, [
    { label: "Total Pemasukan", value: summary.income },
    { label: "Total Pengeluaran", value: summary.expense },
    { label: "Selisih", value: summary.net, tone: "auto" },
  ]);

  const columns: Columns = [
    { label: "Bulan", x: MARGIN, width: 120 },
    { label: "Pemasukan", x: MARGIN + 130, width: 120, align: "right" },
    { label: "Pengeluaran", x: MARGIN + 260, width: 120, align: "right" },
    { label: "Selisih", x: MARGIN + 390, width: A4.width - MARGIN * 2 - 390, align: "right" },
  ];

  cursor.text("Rekap per Bulan", { size: 11, bold: true });
  cursor.down(18);
  drawTableHead(cursor, columns);

  for (const point of summary.months) {
    cursor.ensure(LINE, () => drawTableHead(cursor, columns));

    cursor.text(MONTH_NAMES_ID[point.month - 1], { x: columns[0].x, size: 9 });
    cursor.text(formatAmountPlain(point.income), {
      x: columns[1].x,
      width: columns[1].width,
      align: "right",
      size: 9,
    });
    cursor.text(formatAmountPlain(point.expense), {
      x: columns[2].x,
      width: columns[2].width,
      align: "right",
      size: 9,
    });
    cursor.text(formatAmountPlain(point.net), {
      x: columns[3].x,
      width: columns[3].width,
      align: "right",
      size: 9,
      color: point.net < 0 ? NEGATIVE : POSITIVE,
    });
    cursor.down();
  }

  cursor.down(6);
  cursor.rule();
  cursor.down(LINE);
  cursor.text("Total", { x: columns[0].x, size: 9, bold: true });
  cursor.text(formatAmountPlain(summary.income), {
    x: columns[1].x,
    width: columns[1].width,
    align: "right",
    size: 9,
    bold: true,
  });
  cursor.text(formatAmountPlain(summary.expense), {
    x: columns[2].x,
    width: columns[2].width,
    align: "right",
    size: 9,
    bold: true,
  });
  cursor.text(formatAmountPlain(summary.net), {
    x: columns[3].x,
    width: columns[3].width,
    align: "right",
    size: 9,
    bold: true,
    color: summary.net < 0 ? NEGATIVE : POSITIVE,
  });

  cursor.stampFooters(new Date());
  return doc.save();
}
