import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { categoryService } from '@/src/lib/categories/CategoryService';
import { accountService } from '@/src/lib/accounts/AccountService';
import { Card, SectionTitle } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import ProfileForm from './ProfileForm';
import PasswordForm from './PasswordForm';
import CategorySettings from './CategorySettings';
import AccountSettings from './AccountSettings';
import LogoutButton from './LogoutButton';

/**
 * Menyusun inisial dari nama pengguna untuk dipakai sebagai avatar teks.
 * Hanya dua kata pertama yang diambil supaya lingkaran avatar tidak kepenuhan.
 * @param {string} name - Nama lengkap pengguna.
 * @returns {string} Maksimal dua huruf kapital, atau teks kosong bila nama tidak terbaca.
 */
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(_word => _word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Halaman profil: identitas pengguna, penyuntingan akun dan password, serta
 * pengaturan kategori dan akun rekening.
 * @returns {ReactNode} Halaman profil beserta seluruh pengaturannya.
 */
export default async function ProfilePage() {
  const user = await requireAuthUser();
  const [categories, accounts] = await Promise.all([categoryService.listWithUsage(user.id), accountService.listWithUsage(user.id)]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Profil" subtitle="Kelola akun dan pengaturan aplikasi" />

      <Card className="border-theme-light-border bg-theme-light">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-theme-primary text-lg font-bold text-gray-800">{getInitials(user.name) || '?'}</span>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-800">{user.name}</p>
            <p className="truncate text-xs text-gray-500">@{user.username}</p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500">
              <DynamicIcon icon="ph:envelope-simple" fontSize="14px" />
              {user.email}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <SectionTitle title="Informasi Akun" />
          <ProfileForm name={user.name} username={user.username} />
        </Card>

        <Card className="flex flex-col">
          <SectionTitle title="Ubah Password" />
          <PasswordForm />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Kategori" />
        <p className="mb-4 text-xs text-gray-400">Kategori dipakai untuk mengelompokkan transaksi. Menghapus kategori tidak menghapus transaksinya.</p>
        <CategorySettings categories={categories} />
      </Card>

      <Card>
        <SectionTitle title="Akun Rekening" />
        <p className="mb-4 text-xs text-gray-400">Akun rekening dipakai untuk mengelompokkan transaksi. Menghapus akun rekening tidak menghapus transaksinya.</p>
        <AccountSettings accounts={accounts} />
      </Card>

      <Card>
        <SectionTitle title="Logout" />
        <p className="mb-4 text-xs text-gray-400">Keluar akan mengakhiri sesi di perangkat ini saja.</p>
        <LogoutButton />
      </Card>
    </div>
  );
}
