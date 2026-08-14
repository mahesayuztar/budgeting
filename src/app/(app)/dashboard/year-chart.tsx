import { MONTH_NAMES_ID } from "@/src/core/lib/date";
import type { MonthPoint } from "@/src/core/reports/services/report.service";

/**
 * Bar chart sederhana dari div — tidak perlu library chart untuk 12 batang.
 * Tinggi dinormalisasi terhadap nilai terbesar di tahun tersebut.
 */
export default function YearChart({
  months,
  activeMonth,
}: {
  months: MonthPoint[];
  activeMonth: number;
}) {
  const peak = Math.max(
    1,
    ...months.map((point) => Math.max(point.income, point.expense)),
  );

  return (
    <div className="flex items-end justify-between gap-1.5">
      {months.map((point) => {
        const isActive = point.month === activeMonth;

        return (
          <div key={point.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              <div
                title={`Pemasukan ${MONTH_NAMES_ID[point.month - 1]}`}
                className="w-1/2 rounded-t bg-emerald-400/80"
                style={{ height: `${(point.income / peak) * 100}%` }}
              />
              <div
                title={`Pengeluaran ${MONTH_NAMES_ID[point.month - 1]}`}
                className="w-1/2 rounded-t bg-red-300"
                style={{ height: `${(point.expense / peak) * 100}%` }}
              />
            </div>
            <span
              className={`text-[9px] font-semibold ${
                isActive ? "text-gray-800" : "text-gray-400"
              }`}
            >
              {MONTH_NAMES_ID[point.month - 1].slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
