import { redirect } from 'next/navigation';
import { getAuthUser } from '@/src/lib/auth/AuthDal';

/**
 * Halaman akar aplikasi. Tidak menampilkan apa pun, hanya mengarahkan pengguna
 * ke dashboard bila sesinya sah, atau ke halaman masuk bila tidak.
 * @returns {Promise<never>} Selalu berakhir dengan pengalihan halaman.
 */
export default async function Home() {
  const user = await getAuthUser();
  redirect(user ? '/dashboard' : '/login');
}
