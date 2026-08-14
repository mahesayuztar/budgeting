import { z } from "zod";
import { handleApiError } from "@/src/core/lib/api-response";
import { requireApiUser } from "@/src/core/auth/dal";
import { reportService } from "@/src/core/reports/services/report.service";
import {
  buildMonthlyReportPdf,
  buildYearlyReportPdf,
} from "@/src/core/reports/pdf/report-pdf";
import { transactionService } from "@/src/core/transactions/services/transaction.service";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    period: z.enum(["monthly", "yearly"]).default("monthly"),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine((value) => value.period === "yearly" || value.month !== undefined, {
    message: "Bulan wajib diisi untuk laporan bulanan.",
    path: ["month"],
  });

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const { bytes, filename } =
      query.period === "yearly"
        ? await yearlyReport(user.id, user.name, query.year)
        : await monthlyReport(user.id, user.name, query.year, query.month!);

    // pdf-lib mengembalikan Uint8Array; Buffer memenuhi tipe BodyInit.
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function monthlyReport(
  userId: number,
  userName: string,
  year: number,
  month: number,
) {
  const [summary, transactions] = await Promise.all([
    reportService.getMonthlySummary(userId, year, month),
    transactionService.list(userId, { year, month, limit: 200 }),
  ]);

  return {
    bytes: await buildMonthlyReportPdf({ userName, summary, transactions }),
    filename: `laporan-${year}-${String(month).padStart(2, "0")}.pdf`,
  };
}

async function yearlyReport(userId: number, userName: string, year: number) {
  const summary = await reportService.getYearlySummary(userId, year);

  return {
    bytes: await buildYearlyReportPdf({ userName, summary }),
    filename: `laporan-${year}.pdf`,
  };
}
