type ErrorAlertOwnProps = {
  message: string | null;
};

type SuccessAlertOwnProps = {
  message: string | null;
};

/**
 * Menampilkan pesan kesalahan di atas form. Tidak merender apa pun bila pesan
 * kosong, sehingga pemanggil tidak perlu menjaga kondisi tampilnya sendiri.
 * @param {ErrorAlertOwnProps} props - Props komponen.
 * @param {string | null} props.message - Pesan kesalahan yang ditampilkan.
 * @returns {ReactNode} Kotak peringatan merah, atau null bila pesan kosong.
 */
export function ErrorAlert({ message }: ErrorAlertOwnProps) {
  if (!message) return null;

  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

/**
 * Menampilkan pesan keberhasilan di atas form. Tidak merender apa pun bila
 * pesan kosong, sehingga pemanggil tidak perlu menjaga kondisi tampilnya
 * sendiri.
 * @param {SuccessAlertOwnProps} props - Props komponen.
 * @param {string | null} props.message - Pesan keberhasilan yang ditampilkan.
 * @returns {ReactNode} Kotak pemberitahuan hijau, atau null bila pesan kosong.
 */
export function SuccessAlert({ message }: SuccessAlertOwnProps) {
  if (!message) return null;

  return (
    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
      {message}
    </div>
  );
}
