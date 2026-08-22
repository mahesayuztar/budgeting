'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Field';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Sheet } from '@/src/components/ui/Sheet';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { categoryApi } from '@/src/lib/categories/CategoryApi';
import type { CategoryUsageDTO } from '@/src/lib/categories/CategoryService';
import { ENTITY_COLORS, ENTITY_COLOR_OPTIONS } from '@/src/lib/ThemeConstants';
import type { CategoryInput } from '@/src/lib/categories/CategoryValidator';

type EditableTransactionType = 'INCOME' | 'EXPENSE';
type TransactionType = CategoryUsageDTO['type'];

type CategoryForm = {
  name: string;
  type: EditableTransactionType;
  icon: string;
  color: string;
};

type CategoryIconOption = {
  icon: string;
  label: string;
};

type CategoryIconGroup = {
  label: string;
  options: ReadonlyArray<CategoryIconOption>;
};

/**
 * Pilihan ikon mencakup sumber pemasukan utama dan kelompok pengeluaran rumah
 * tangga yang umum, lalu dikelompokkan agar daftar yang besar tetap mudah
 * dipindai. Label dipakai untuk pencarian dan nama yang dibaca screen reader.
 */
const CATEGORY_ICON_GROUPS: ReadonlyArray<CategoryIconGroup> = [
  {
    label: 'Keuangan & Pemasukan',
    options: [
      { icon: 'ph:wallet', label: 'Dompet' },
      { icon: 'ph:money', label: 'Uang tunai' },
      { icon: 'ph:coins', label: 'Koin' },
      { icon: 'ph:bank', label: 'Bank' },
      { icon: 'ph:credit-card', label: 'Kartu kredit' },
      { icon: 'ph:piggy-bank', label: 'Tabungan' },
      { icon: 'ph:chart-line-up', label: 'Investasi' },
      { icon: 'ph:briefcase', label: 'Gaji dan pekerjaan' },
      { icon: 'ph:storefront', label: 'Usaha' },
      { icon: 'ph:tractor', label: 'Pertanian' },
      { icon: 'ph:hand-coins', label: 'Pendapatan' },
      { icon: 'ph:handshake', label: 'Komisi' },
      { icon: 'ph:gift', label: 'Bonus dan hadiah' },
      { icon: 'ph:arrow-counter-clockwise', label: 'Refund' },
      { icon: 'ph:plus-circle', label: 'Pemasukan lain' },
    ],
  },
  {
    label: 'Makanan & Minuman',
    options: [
      { icon: 'ph:fork-knife', label: 'Makan dan minum' },
      { icon: 'ph:shopping-cart', label: 'Belanja bahan makanan' },
      { icon: 'ph:coffee', label: 'Kopi' },
      { icon: 'ph:cooking-pot', label: 'Memasak' },
      { icon: 'ph:bowl-food', label: 'Makanan' },
      { icon: 'ph:hamburger', label: 'Makanan cepat saji' },
      { icon: 'ph:pizza', label: 'Restoran' },
      { icon: 'ph:ice-cream', label: 'Camilan' },
      { icon: 'ph:cake', label: 'Kue dan perayaan' },
    ],
  },
  {
    label: 'Rumah & Tagihan',
    options: [
      { icon: 'ph:house', label: 'Rumah' },
      { icon: 'ph:buildings', label: 'Apartemen dan properti' },
      { icon: 'ph:bed', label: 'Sewa dan akomodasi' },
      { icon: 'ph:couch', label: 'Perabot' },
      { icon: 'ph:lightbulb', label: 'Listrik' },
      { icon: 'ph:drop', label: 'Air' },
      { icon: 'ph:flame', label: 'Gas' },
      { icon: 'ph:lightning', label: 'Energi' },
      { icon: 'ph:wifi-high', label: 'Internet' },
      { icon: 'ph:device-mobile', label: 'Pulsa dan telepon' },
      { icon: 'ph:broom', label: 'Keperluan rumah' },
      { icon: 'ph:receipt', label: 'Tagihan' },
    ],
  },
  {
    label: 'Transportasi & Perjalanan',
    options: [
      { icon: 'ph:bus', label: 'Transportasi umum' },
      { icon: 'ph:car', label: 'Mobil' },
      { icon: 'ph:motorcycle', label: 'Motor' },
      { icon: 'ph:bicycle', label: 'Sepeda' },
      { icon: 'ph:train', label: 'Kereta' },
      { icon: 'ph:airplane-tilt', label: 'Pesawat' },
      { icon: 'ph:gas-pump', label: 'Bahan bakar' },
      { icon: 'ph:map-pin', label: 'Lokasi' },
      { icon: 'ph:suitcase-rolling', label: 'Perjalanan' },
    ],
  },
  {
    label: 'Kesehatan & Pribadi',
    options: [
      { icon: 'ph:heartbeat', label: 'Kesehatan' },
      { icon: 'ph:first-aid-kit', label: 'Pertolongan medis' },
      { icon: 'ph:pill', label: 'Obat' },
      { icon: 'ph:hospital', label: 'Rumah sakit' },
      { icon: 'ph:tooth', label: 'Perawatan gigi' },
      { icon: 'ph:barbell', label: 'Kebugaran' },
      { icon: 'ph:person-simple-run', label: 'Olahraga' },
      { icon: 'ph:scissors', label: 'Salon' },
      { icon: 'ph:t-shirt', label: 'Pakaian' },
      { icon: 'ph:eyeglasses', label: 'Aksesori' },
    ],
  },
  {
    label: 'Keluarga & Pendidikan',
    options: [
      { icon: 'ph:graduation-cap', label: 'Pendidikan' },
      { icon: 'ph:book-open', label: 'Buku' },
      { icon: 'ph:student', label: 'Sekolah dan kuliah' },
      { icon: 'ph:chalkboard-teacher', label: 'Kursus' },
      { icon: 'ph:backpack', label: 'Perlengkapan sekolah' },
      { icon: 'ph:pencil', label: 'Alat tulis' },
      { icon: 'ph:baby', label: 'Anak dan bayi' },
      { icon: 'ph:users-three', label: 'Keluarga' },
      { icon: 'ph:paw-print', label: 'Hewan peliharaan' },
    ],
  },
  {
    label: 'Belanja & Hiburan',
    options: [
      { icon: 'ph:shopping-bag', label: 'Belanja' },
      { icon: 'ph:game-controller', label: 'Game' },
      { icon: 'ph:film-strip', label: 'Film' },
      { icon: 'ph:music-note', label: 'Musik' },
      { icon: 'ph:television', label: 'Televisi dan streaming' },
      { icon: 'ph:camera', label: 'Fotografi' },
      { icon: 'ph:palette', label: 'Hobi kreatif' },
      { icon: 'ph:soccer-ball', label: 'Olahraga dan rekreasi' },
      { icon: 'ph:ticket', label: 'Tiket dan acara' },
      { icon: 'ph:confetti', label: 'Perayaan' },
    ],
  },
  {
    label: 'Kewajiban & Lainnya',
    options: [
      { icon: 'ph:shield-check', label: 'Asuransi' },
      { icon: 'ph:scales', label: 'Pajak dan hukum' },
      { icon: 'ph:file-text', label: 'Administrasi' },
      { icon: 'ph:calendar-check', label: 'Langganan' },
      { icon: 'ph:hand-heart', label: 'Donasi' },
      { icon: 'ph:percent', label: 'Bunga dan biaya' },
      { icon: 'ph:calculator', label: 'Keuangan lain' },
      { icon: 'ph:laptop', label: 'Teknologi' },
      { icon: 'ph:package', label: 'Paket dan pengiriman' },
      { icon: 'ph:dots-three-circle', label: 'Lainnya' },
    ],
  },
];

const DEFAULT_CATEGORY_ICON = CATEGORY_ICON_GROUPS[0].options[0].icon;

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: '',
  type: 'EXPENSE',
  icon: DEFAULT_CATEGORY_ICON,
  color: ENTITY_COLORS[0],
};

const CATEGORY_TYPE_LABEL: Record<TransactionType, string> = {
  EXPENSE: 'Pengeluaran',
  INCOME: 'Pemasukan',
  TRANSFER: 'Transfer',
};

const CATEGORY_TYPES: ReadonlyArray<TransactionType> = ['EXPENSE', 'INCOME', 'TRANSFER'];
const EDITABLE_CATEGORY_TYPES: ReadonlyArray<EditableTransactionType> = ['EXPENSE', 'INCOME'];

type CategoryRowOwnProps = {
  category: CategoryUsageDTO;
  onEdit: () => void;
  onDeleted: () => void;
};

type CategorySettingsOwnProps = {
  categories: CategoryUsageDTO[];
};

/**
 * Satu baris kategori pada daftar pengaturan, lengkap dengan aksi ubah dan
 * hapus. Dialog konfirmasi menyebutkan jumlah transaksi terdampak supaya
 * pengguna tahu bahwa transaksi lamanya akan kehilangan label kategori.
 * @param {CategoryRowOwnProps} props - Props komponen.
 * @param {CategoryUsageDTO} props.category - Kategori beserta jumlah transaksinya.
 * @param {() => void} props.onEdit - Dijalankan saat pengguna menekan tombol ubah.
 * @param {() => void} props.onDeleted - Dijalankan setelah kategori berhasil dihapus.
 * @returns {ReactNode} Baris kategori beserta dialog konfirmasi hapusnya.
 */
function CategoryRow({ category, onEdit, onDeleted }: CategoryRowOwnProps) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useApiMutation(categoryApi.remove);
  const isSystem = category.type === 'TRANSFER';

  const removalDescription = category.transactionCount ? `${category.transactionCount} transaksi akan menjadi tanpa kategori.` : 'Kategori ini belum dipakai transaksi mana pun.';

  async function handleConfirm() {
    const deleted = await run(category.uuid);
    setConfirming(false);
    if (deleted) onDeleted();
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700" style={{ backgroundColor: category.color ?? '#F1F1F1' }}>
        <DynamicIcon icon={category.icon ?? 'ph:circle-dashed'} fontSize="16px" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{category.name}</p>
        <p className="text-[11px] text-gray-400">{`${category.transactionCount} transaksi`}</p>
      </div>

      {isSystem ? (
        <span title="Kategori bawaan sistem" aria-label="Kategori bawaan sistem" className="rounded-lg bg-gray-50 p-1.5 text-gray-400">
          <DynamicIcon icon="ph:lock-simple" fontSize="16px" />
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Ubah kategori ${category.name}`}
            className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <DynamicIcon icon="ph:pencil-simple" fontSize="16px" />
          </button>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            aria-label={`Hapus kategori ${category.name}`}
            className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <DynamicIcon icon="ph:trash" fontSize="16px" />
          </button>

          <ConfirmModal
            open={confirming}
            icon="ph:trash"
            title={`Hapus kategori "${category.name}"?`}
            description={removalDescription}
            confirmLabel="Ya, hapus"
            pending={pending}
            onConfirm={handleConfirm}
            onCancel={() => setConfirming(false)}
          />
        </>
      )}
    </li>
  );
}

/**
 * Pengaturan kategori: daftar kategori per tipe beserta panel isian untuk
 * menambah maupun mengubahnya. Panel dipakai bergantian untuk kedua mode supaya
 * pesan error dan state pending-nya tunggal.
 * @param {CategorySettingsOwnProps} props - Props komponen.
 * @param {CategoryUsageDTO[]} props.categories - Seluruh kategori beserta jumlah transaksinya.
 * @returns {ReactNode} Daftar kategori beserta panel isiannya.
 */
export default function CategorySettings({ categories }: CategorySettingsOwnProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [iconQuery, setIconQuery] = useState('');

  const save = useCallback((uuid: string | null, input: CategoryInput) => (uuid ? categoryApi.update(uuid, input) : categoryApi.create(input)), []);

  const { run, pending, error, fieldErrors, reset } = useApiMutation(save);

  function openCreateSheet(type: EditableTransactionType) {
    setEditingUuid(null);
    setForm({ ...EMPTY_CATEGORY_FORM, type });
    setIconQuery('');
    reset();
    setOpen(true);
  }

  function openEditSheet(category: CategoryUsageDTO) {
    if (category.type === 'TRANSFER') return;

    setEditingUuid(category.uuid);
    setForm({
      name: category.name,
      type: category.type,
      icon: category.icon ?? DEFAULT_CATEGORY_ICON,
      color: category.color ?? ENTITY_COLORS[0],
    });
    setIconQuery('');
    reset();
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const saved = await run(editingUuid, form);
    if (!saved) return;

    setOpen(false);
    router.refresh();
  }

  const normalizedIconQuery = iconQuery.trim().toLocaleLowerCase('id-ID');
  const visibleIconGroups = CATEGORY_ICON_GROUPS.map(_group => ({
    ..._group,
    options: _group.options.filter(_option => !normalizedIconQuery || `${_group.label} ${_option.label}`.toLocaleLowerCase('id-ID').includes(normalizedIconQuery)),
  })).filter(_group => _group.options.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {CATEGORY_TYPES.map(_type => {
        const items = categories.filter(_category => _category.type === _type);

        return (
          <div key={`category_settings__group_${_type}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">{CATEGORY_TYPE_LABEL[_type]}</h3>
              {_type !== 'TRANSFER' && (
                <button
                  type="button"
                  onClick={() => openCreateSheet(_type)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-theme-accent hover:text-gray-900"
                >
                  <DynamicIcon icon="ph:plus" fontSize="14px" />
                  Tambah
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon="ph:tag"
                title={`Belum ada kategori ${CATEGORY_TYPE_LABEL[_type].toLowerCase()}`}
                description={_type === 'TRANSFER' ? 'Kategori sistem Transfer belum tersedia.' : 'Tambahkan kategori agar transaksi lebih mudah dikelompokkan.'}
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(_category => (
                  <CategoryRow key={`category_settings__row_${_category.uuid}`} category={_category} onEdit={() => openEditSheet(_category)} onDeleted={() => router.refresh()} />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <Sheet open={open} title={editingUuid ? 'Ubah Kategori' : 'Tambah Kategori'} size="lg" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {EDITABLE_CATEGORY_TYPES.map(_option => (
              <button
                key={`category_settings__type_${_option}`}
                type="button"
                onClick={() => setForm(_previous => ({ ..._previous, type: _option }))}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${form.type === _option ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                {CATEGORY_TYPE_LABEL[_option]}
              </button>
            ))}
          </div>

          <ErrorAlert message={error} />

          <Input
            label="Nama Kategori"
            required
            maxLength={50}
            placeholder="Misalnya: Belanja Bulanan"
            value={form.name}
            onChange={event => setForm(_previous => ({ ..._previous, name: event.target.value }))}
            errors={fieldErrors.name}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Ikon</label>
            <div className="relative">
              <DynamicIcon icon="ph:magnifying-glass" fontSize="16px" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={iconQuery}
                onChange={event => setIconQuery(event.target.value)}
                aria-label="Cari ikon kategori"
                placeholder="Cari ikon, misalnya makanan atau investasi"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-300 focus:border-theme-light-border"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 p-3">
              {visibleIconGroups.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">Ikon tidak ditemukan.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleIconGroups.map(_group => (
                    <div key={`category_settings__icon_group_${_group.label}`} className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{_group.label}</p>
                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                        {_group.options.map(_option => (
                          <button
                            key={`category_settings__icon_${_option.icon}`}
                            type="button"
                            onClick={() => setForm(_previous => ({ ..._previous, icon: _option.icon }))}
                            aria-label={`Pilih ikon ${_option.label}`}
                            aria-pressed={form.icon === _option.icon}
                            title={_option.label}
                            className={`flex h-10 items-center justify-center rounded-xl border transition-colors ${
                              form.icon === _option.icon
                                ? 'border-theme-light-border bg-theme-light text-gray-800'
                                : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <DynamicIcon icon={_option.icon} fontSize="18px" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Warna</label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_COLOR_OPTIONS.map(_option => (
                <button
                  key={`category_settings__color_${_option.value}`}
                  type="button"
                  onClick={() => setForm(_previous => ({ ..._previous, color: _option.value }))}
                  aria-label={`Pilih warna ${_option.label}`}
                  aria-pressed={form.color === _option.value}
                  title={_option.label}
                  style={{ backgroundColor: _option.value }}
                  className={`h-9 w-9 rounded-full border border-black/5 transition-transform ${
                    form.color === _option.value ? 'ring-2 ring-gray-800 ring-offset-2' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
