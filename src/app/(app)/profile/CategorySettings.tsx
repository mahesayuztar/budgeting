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
import { ENTITY_COLORS } from '@/src/lib/ThemeConstants';
import type { CategoryInput } from '@/src/lib/categories/CategoryValidator';

type TransactionType = 'INCOME' | 'EXPENSE';

type CategoryForm = {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

const CATEGORY_ICONS = [
  'ph:wallet',
  'ph:gift',
  'ph:plus-circle',
  'ph:fork-knife',
  'ph:bus',
  'ph:shopping-bag',
  'ph:receipt',
  'ph:game-controller',
  'ph:house',
  'ph:heartbeat',
  'ph:graduation-cap',
  'ph:airplane-tilt',
  'ph:coffee',
  'ph:gas-pump',
  'ph:t-shirt',
  'ph:piggy-bank',
  'ph:cell-phone',
  'ph:paw-print',
  'ph:baby',
  'ph:dots-three-circle',
];

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: '',
  type: 'EXPENSE',
  icon: CATEGORY_ICONS[0],
  color: ENTITY_COLORS[0],
};

const CATEGORY_TYPE_LABEL: Record<TransactionType, string> = {
  EXPENSE: 'Pengeluaran',
  INCOME: 'Pemasukan',
};

const CATEGORY_TYPES: ReadonlyArray<TransactionType> = ['EXPENSE', 'INCOME'];

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
        <p className="text-[11px] text-gray-400">{category.transactionCount} transaksi</p>
      </div>

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

  const save = useCallback((uuid: string | null, input: CategoryInput) => (uuid ? categoryApi.update(uuid, input) : categoryApi.create(input)), []);

  const { run, pending, error, fieldErrors, reset } = useApiMutation(save);

  function openCreateSheet(type: TransactionType) {
    setEditingUuid(null);
    setForm({ ...EMPTY_CATEGORY_FORM, type });
    reset();
    setOpen(true);
  }

  function openEditSheet(category: CategoryUsageDTO) {
    if (category.type === 'TRANSFER') return;

    setEditingUuid(category.uuid);
    setForm({
      name: category.name,
      type: category.type,
      icon: category.icon ?? CATEGORY_ICONS[0],
      color: category.color ?? ENTITY_COLORS[0],
    });
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

  return (
    <div className="flex flex-col gap-5">
      {CATEGORY_TYPES.map(_type => {
        const items = categories.filter(_category => _category.type === _type);

        return (
          <div key={`category_settings__group_${_type}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">{CATEGORY_TYPE_LABEL[_type]}</h3>
              <button
                type="button"
                onClick={() => openCreateSheet(_type)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-theme-accent hover:text-gray-900"
              >
                <DynamicIcon icon="ph:plus" fontSize="14px" />
                Tambah
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon="ph:tag"
                title={`Belum ada kategori ${CATEGORY_TYPE_LABEL[_type].toLowerCase()}`}
                description="Tambahkan kategori agar transaksi lebih mudah dikelompokkan."
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

      <Sheet open={open} title={editingUuid ? 'Ubah Kategori' : 'Tambah Kategori'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {CATEGORY_TYPES.map(_option => (
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
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_ICONS.map(_icon => (
                <button
                  key={`category_settings__icon_${_icon}`}
                  type="button"
                  onClick={() => setForm(_previous => ({ ..._previous, icon: _icon }))}
                  aria-label={_icon}
                  aria-pressed={form.icon === _icon}
                  className={`flex h-10 items-center justify-center rounded-xl border transition-colors ${
                    form.icon === _icon ? 'border-theme-light-border bg-theme-light text-gray-800' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <DynamicIcon icon={_icon} fontSize="18px" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Warna</label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_COLORS.map(_color => (
                <button
                  key={`category_settings__color_${_color}`}
                  type="button"
                  onClick={() => setForm(_previous => ({ ..._previous, color: _color }))}
                  aria-label={`Warna ${_color}`}
                  aria-pressed={form.color === _color}
                  style={{ backgroundColor: _color }}
                  className={`h-9 w-9 rounded-full transition-transform ${form.color === _color ? 'ring-2 ring-gray-800 ring-offset-2' : 'hover:scale-105'}`}
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
