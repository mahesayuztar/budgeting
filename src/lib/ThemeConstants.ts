/**
 * Palet warna yang dapat dipilih pengguna untuk menandai kategori dan akun.
 * Semua warna dijaga cukup terang agar ikon abu-abu gelap tetap terbaca, tetapi
 * rentang hue-nya lebar supaya beberapa entitas mudah dibedakan pada grafik.
 */
export const ENTITY_COLOR_OPTIONS = [
  { value: '#7BC67B', label: 'Hijau daun' },
  { value: '#86D4A8', label: 'Hijau mint' },
  { value: '#8FD3C1', label: 'Toska muda' },
  { value: '#79D0D8', label: 'Toska' },
  { value: '#77BFE2', label: 'Biru laut' },
  { value: '#9AD0EC', label: 'Biru langit' },
  { value: '#A3C7E8', label: 'Biru muda' },
  { value: '#86A8E7', label: 'Biru kobalt' },
  { value: '#A99BE8', label: 'Nila' },
  { value: '#C9B6E4', label: 'Lavender' },
  { value: '#D7A6E8', label: 'Ungu muda' },
  { value: '#E9A8D7', label: 'Magenta muda' },
  { value: '#EA8FA3', label: 'Merah mawar' },
  { value: '#F5A9A9', label: 'Merah muda' },
  { value: '#F39B7F', label: 'Koral' },
  { value: '#FFBE91', label: 'Persik' },
  { value: '#FFD59E', label: 'Aprikot' },
  { value: '#F2C66D', label: 'Kuning oker' },
  { value: '#F8E16C', label: 'Kuning cerah' },
  { value: '#E6E78C', label: 'Kuning limau' },
  { value: '#B5D66D', label: 'Hijau limau' },
  { value: '#E3B46D', label: 'Karamel' },
  { value: '#C9A98D', label: 'Cokelat muda' },
  { value: '#A8B6C6', label: 'Biru kelabu' },
  { value: '#D0D0D0', label: 'Abu-abu' },
] as const;

/** Nilai hex saja untuk fallback warna grafik dan nilai awal form. */
export const ENTITY_COLORS: ReadonlyArray<string> = ENTITY_COLOR_OPTIONS.map(_option => _option.value);
