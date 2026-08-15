import { formatIDR } from '@/src/helpers/MoneyHelper';

type MoneyTone = 'auto' | 'income' | 'expense' | 'neutral';

const MONEY_TONES: Record<Exclude<MoneyTone, 'auto'>, string> = {
  income: 'text-emerald-600',
  expense: 'text-red-500',
  neutral: 'text-gray-800',
};

type MoneyOwnProps = {
  value: number;
  tone?: MoneyTone;
  className?: string;
};

/**
 * Menampilkan nilai uang dalam format rupiah dengan angka rata lebar, sehingga
 * kolom nominal tetap sejajar antar baris. Nada `auto` menentukan warnanya dari
 * tanda nilainya.
 * @param {MoneyOwnProps} props - Props komponen.
 * @param {number} props.value - Nilai uang yang ditampilkan.
 * @param {MoneyTone} props.tone - Nada warna nominal, default neutral.
 * @param {string} props.className - Kelas tambahan yang digabung ke kelas bawaan.
 * @returns {ReactNode} Teks nominal rupiah yang sudah bergaya.
 */
export function Money({ value, tone = 'neutral', className = '' }: MoneyOwnProps) {
  const resolvedTone = tone === 'auto' ? (value < 0 ? 'expense' : 'income') : tone;

  return <span className={`tabular-nums ${MONEY_TONES[resolvedTone]} ${className}`}>{formatIDR(value)}</span>;
}
