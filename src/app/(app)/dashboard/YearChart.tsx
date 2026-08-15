import { MONTH_NAMES_ID } from '@/src/helpers/DateHelper';
import type { MonthPoint } from '@/src/lib/reports/ReportService';

type YearChartOwnProps = {
  months: MonthPoint[];
  activeMonth: number;
};

/**
 * Diagram batang dua belas bulan yang disusun dari elemen div biasa, karena
 * dua belas batang belum sepadan dengan ongkos memuat sebuah library chart.
 * Tinggi tiap batang dinormalisasi terhadap nilai terbesar pada tahun tersebut.
 * @param {YearChartOwnProps} props - Props komponen.
 * @param {MonthPoint[]} props.months - Titik data pemasukan dan pengeluaran tiap bulan.
 * @param {number} props.activeMonth - Bulan yang sedang dipilih, ditandai lebih pekat.
 * @returns {ReactNode} Diagram batang pemasukan dan pengeluaran setahun.
 */
export default function YearChart({ months, activeMonth }: YearChartOwnProps) {
  const peak = Math.max(1, ...months.map(_point => Math.max(_point.income, _point.expense)));

  return (
    <div className="flex items-end justify-between gap-1.5">
      {months.map(_point => {
        const isActive = _point.month === activeMonth;

        return (
          <div key={`year_chart__month_${_point.month}`} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              <div title={`Pemasukan ${MONTH_NAMES_ID[_point.month - 1]}`} className="w-1/2 rounded-t bg-emerald-400/80" style={{ height: `${(_point.income / peak) * 100}%` }} />
              <div title={`Pengeluaran ${MONTH_NAMES_ID[_point.month - 1]}`} className="w-1/2 rounded-t bg-red-300" style={{ height: `${(_point.expense / peak) * 100}%` }} />
            </div>
            <span className={`text-[9px] font-semibold ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{MONTH_NAMES_ID[_point.month - 1].slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}
