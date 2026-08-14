import { requireAuthUser } from "@/src/core/auth/dal";
import { categoryService } from "@/src/core/categories/services/category.service";
import { Card, SectionTitle } from "@/src/core/components/ui/card";
import { PageHeader } from "@/src/core/components/ui/page-header";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import ProfileForm from "./profile-form";
import PasswordForm from "./password-form";
import CategorySettings from "./category-settings";
import LogoutButton from "./logout-button";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const categories = await categoryService.listWithUsage(user.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Profil" subtitle="Kelola akun dan pengaturan aplikasi" />

      <Card className="border-theme-light-border bg-theme-light">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-theme-primary text-lg font-bold text-gray-800">
            {initials(user.name) || "?"}
          </span>

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
        <Card>
          <SectionTitle title="Informasi Akun" />
          <ProfileForm name={user.name} username={user.username} />
        </Card>

        <Card>
          <SectionTitle title="Ubah Password" />
          <PasswordForm />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Kategori" />
        {/* Kategori adalah satu-satunya master data yang dipegang pengguna,
            jadi pengaturannya ditaruh di halaman profil, bukan halaman sendiri. */}
        <p className="mb-4 text-xs text-gray-400">
          Kategori dipakai untuk mengelompokkan transaksi. Menghapus kategori
          tidak menghapus transaksinya.
        </p>
        <CategorySettings categories={categories} />
      </Card>

      <Card>
        <SectionTitle title="Sesi" />
        <p className="mb-4 text-xs text-gray-400">
          Keluar akan mengakhiri sesi di perangkat ini saja.
        </p>
        <LogoutButton />
      </Card>
    </div>
  );
}
