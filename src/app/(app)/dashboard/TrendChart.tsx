export type TrendPoint = {
  key: string;
  label: string;
  title: string;
  income: number;
  expense: number;
  isActive: boolean;
};

type TrendChartOwnProps = {
  points: TrendPoint[];
};

/**
 * Diagram batang pemasukan dan pengeluaran yang disusun dari elemen div biasa,
 * karena belasan batang belum sepadan dengan ongkos memuat sebuah library
 * chart. Tinggi tiap batang dinormalisasi terhadap nilai terbesar pada titik
 * data yang dikirim, sehingga komponennya sama saja dipakai untuk rentang bulan
 * maupun rentang hari.
 * @param {TrendChartOwnProps} props - Props komponen.
 * @param {TrendPoint[]} props.points - Titik data pemasukan dan pengeluaran yang digambar berurutan.
 * @returns {ReactNode} Diagram batang pemasukan dan pengeluaran.
 */
export default function TrendChart({ points }: TrendChartOwnProps) {
  const peak = Math.max(1, ...points.map(_point => Math.max(_point.income, _point.expense)));

  return (
    <div className="flex items-end justify-between gap-1.5">
      {points.map(_point => (
        <div key={`trend_chart__point_${_point.key}`} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-24 w-full items-end justify-center gap-0.5">
            <div title={`Pemasukan ${_point.title}`} className="w-1/2 max-w-3 rounded-t bg-emerald-400/80" style={{ height: `${(_point.income / peak) * 100}%` }} />
            <div title={`Pengeluaran ${_point.title}`} className="w-1/2 max-w-3 rounded-t bg-red-300" style={{ height: `${(_point.expense / peak) * 100}%` }} />
          </div>
          <span className={`text-[9px] font-semibold ${_point.isActive ? 'text-gray-800' : 'text-gray-400'}`}>{_point.label}</span>
        </div>
      ))}
    </div>
  );
}
