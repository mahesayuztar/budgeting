import DynamicIcon from '@/src/components/commons/DynamicIcon';

type EmptyStateOwnProps = {
  icon?: string;
  title: string;
  description?: string;
};

/**
 * Menampilkan keadaan kosong sebuah daftar. Ikonnya dibingkai lingkaran krem
 * sebagai sentuhan hangat pada area yang belum berisi data, tanpa ikut
 * mewarnai area data ketika daftar sudah terisi.
 * @param {EmptyStateOwnProps} props - Props komponen.
 * @param {string} props.icon - Nama ikon Iconify yang ditampilkan, default `ph:tray`.
 * @param {string} props.title - Judul singkat keadaan kosong.
 * @param {string} props.description - Penjelasan tambahan di bawah judul, opsional.
 * @returns {ReactNode} Blok keadaan kosong yang terpusat.
 */
export function EmptyState({ icon = 'ph:tray', title, description }: EmptyStateOwnProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-theme-light text-theme-light-border">
        <DynamicIcon icon={icon} fontSize="26px" />
      </span>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description && <p className="max-w-xs text-xs text-gray-400">{description}</p>}
    </div>
  );
}
