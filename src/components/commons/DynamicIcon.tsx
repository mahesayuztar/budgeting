'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Icon, loadIcon, type IconProps, type IconifyIcon } from '@iconify/react';

const ICON_CACHE_KEY = 'icon_cache';

let iconCache: Record<string, IconifyIcon> = {};

/**
 * Memuat cache ikon yang tersimpan di localStorage ke memori. Dijalankan sekali
 * saat modul dimuat di browser supaya ikon yang pernah diunduh tidak diminta
 * ulang ke jaringan pada kunjungan berikutnya.
 * @returns {void}
 */
function loadIconCache() {
  if (typeof window === 'undefined') return;

  try {
    const saved = localStorage.getItem(ICON_CACHE_KEY);
    if (saved) iconCache = JSON.parse(saved);
  } catch (error) {
    console.error('Gagal memuat cache ikon', error);
  }
}

/**
 * Menyimpan cache ikon di memori kembali ke localStorage. Kegagalan penyimpanan
 * sengaja hanya dicatat, karena ikon tetap dapat dimuat dari jaringan.
 * @returns {void}
 */
function saveIconCache() {
  try {
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(iconCache));
  } catch (error) {
    console.error('Gagal menyimpan cache ikon', error);
  }
}

loadIconCache();

/**
 * Menampilkan ikon Iconify sambil menyimpan hasil unduhannya ke localStorage.
 * Kegagalan pemuatan sengaja diserap: tanpa penanganan itu setiap ikon yang
 * gagal menjadi unhandled rejection dan ikonnya diam-diam kosong, sedangkan
 * `<Icon>` sendiri masih mampu memuat ulang lewat nama ikonnya.
 * @param {IconProps} props - Props komponen Icon milik Iconify.
 * @param {string} props.icon - Nama ikon Iconify yang ditampilkan.
 * @returns {ReactNode} Elemen ikon Iconify.
 */
const DynamicIcon = ({ icon, ...rest }: IconProps) => {
  const [loadedIcon, setLoadedIcon] = useState<IconifyIcon | string>(() => iconCache[icon as string] ?? icon);

  useEffect(() => {
    const cached = iconCache[icon as string];

    if (cached) {
      setLoadedIcon(cached);
      return;
    }

    let cancelled = false;

    loadIcon(icon as string)
      .then(data => {
        if (!cancelled && data) {
          iconCache[icon as string] = data;
          saveIconCache();
          setLoadedIcon(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [icon]);

  return <Icon icon={loadedIcon} {...rest} />;
};

export default DynamicIcon;
