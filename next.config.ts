import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Izinkan perangkat di jaringan lokal memuat asset dev dan koneksi HMR.
  // Tanpa ini, halaman server tetap tampil tetapi bundle React dari origin IP
  // diblokir oleh Next.js sehingga form jatuh ke submit HTML biasa.
  allowedDevOrigins: ['192.168.1.6'],
};

export default nextConfig;
