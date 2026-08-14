"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Icon, IconProps, loadIcon, IconifyIcon } from "@iconify/react";

const ICON_CACHE_KEY = "icon_cache";

let iconCache: Record<string, IconifyIcon> = {};

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(ICON_CACHE_KEY);
    if (saved) {
      iconCache = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load icon cache", e);
  }
}

const saveCache = () => {
  try {
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(iconCache));
  } catch (e) {
    console.error("Failed to save icon cache", e);
  }
};

const DynamicIcon = ({ icon, ...rest }: IconProps) => {
  const [loadedIcon, setLoadedIcon] = useState<IconifyIcon | string>(() => {
    return iconCache[icon as string] ?? icon;
  });

  useEffect(() => {
    const cached = iconCache[icon as string];

    if (cached) {
      setLoadedIcon(cached);
      return;
    }

    let cancelled = false;

    // Tanpa .catch(), setiap ikon yang gagal dimuat jadi unhandled rejection
    // dan ikonnya diam-diam kosong. <Icon> sudah bisa fallback ke nama ikon.
    loadIcon(icon as string)
      .then((data) => {
        if (!cancelled && data) {
          iconCache[icon as string] = data;
          saveCache();
          setLoadedIcon(data);
        }
      })
      .catch(() => {
        /* biarkan <Icon> memuat sendiri lewat nama ikonnya */
      });

    return () => {
      cancelled = true;
    };
  }, [icon]);

  return <Icon icon={loadedIcon} {...rest} />;
};

export default DynamicIcon;
