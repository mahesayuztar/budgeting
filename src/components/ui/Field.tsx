'use client';

import { type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

export const CONTROL_CLASS = 'w-full rounded-xl border bg-white px-4 py-3 text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400';

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type FieldShellOwnProps = {
  label: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
};

type FieldErrorOwnProps = {
  messages?: string[];
  fieldName: string;
};

type InputOwnProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errors?: string[];
  hint?: string;
};

type SelectOwnProps = {
  label: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  errors?: string[];
  hint?: string;
  disabled?: boolean;
  searchable?: boolean;
  regexSearch?: boolean;
  name?: string;
  className?: string;
};

/**
 * Menentukan kelas garis tepi kontrol isian sesuai ada tidaknya pesan error.
 * @param {boolean} hasError - true bila field sedang menampilkan pesan error.
 * @returns {string} Kelas garis tepi beserta warna fokusnya.
 */
export function getBorderClass(hasError: boolean) {
  return hasError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-theme-accent';
}

/**
 * Menyaring opsi select berdasarkan kata kunci, mencocokkan label, nilai, dan
 * keterangan opsi. Pola regex yang belum lengkap saat pengguna masih mengetik
 * akan gagal dikompilasi, dan pada kondisi itu pencarian jatuh ke pencocokan
 * teks biasa supaya daftar tidak mendadak kosong.
 * @param {SelectOption[]} options - Seluruh opsi yang tersedia.
 * @param {string} search - Kata kunci pencarian dari pengguna.
 * @param {boolean} regexSearch - Perlakukan kata kunci sebagai regex bila true.
 * @returns {SelectOption[]} Opsi yang cocok dengan kata kunci.
 */
function filterSelectOptions(options: SelectOption[], search: string, regexSearch: boolean): SelectOption[] {
  const query = search.trim();

  if (!query) return options;

  if (regexSearch) {
    try {
      const regex = new RegExp(query, 'i');
      return options.filter(_option => regex.test(_option.label) || regex.test(_option.value) || regex.test(_option.description ?? ''));
    } catch {
      return filterSelectOptions(options, search, false);
    }
  }

  const normalizedQuery = query.toLowerCase();

  return options.filter(
    _option =>
      _option.label.toLowerCase().includes(normalizedQuery) ||
      _option.value.toLowerCase().includes(normalizedQuery) ||
      _option.description?.toLowerCase().includes(normalizedQuery),
  );
}

/**
 * Menampilkan seluruh pesan error sebuah field secara berurutan. Dipakai oleh
 * form yang menyusun label dan kontrolnya sendiri, sehingga tidak memakai
 * FieldShell.
 * @param {FieldErrorOwnProps} props - Props komponen.
 * @param {string[]} props.messages - Daftar pesan error field, opsional.
 * @param {string} props.fieldName - Nama field, dipakai membentuk key React yang unik.
 * @returns {ReactNode} Daftar pesan error, atau null bila tidak ada pesan.
 */
export function FieldError({ messages, fieldName }: FieldErrorOwnProps) {
  if (!messages?.length) return null;

  return (
    <>
      {messages.map(_message => (
        <p key={`field_error__${fieldName}_${_message}`} className="text-xs font-medium text-red-600">
          {_message}
        </p>
      ))}
    </>
  );
}

/**
 * Kerangka satu field form: label di atas kontrol, lalu petunjuk atau daftar
 * pesan error di bawahnya. Petunjuk disembunyikan saat ada error supaya pesan
 * yang perlu ditindaklanjuti tidak tenggelam.
 * @param {FieldShellOwnProps} props - Props komponen.
 * @param {string} props.label - Label field.
 * @param {string[]} props.errors - Daftar pesan error field, opsional.
 * @param {string} props.hint - Petunjuk pengisian di bawah kontrol, opsional.
 * @param {ReactNode} props.children - Kontrol isian yang dibungkus.
 * @returns {ReactNode} Field lengkap beserta label, petunjuk, dan pesan errornya.
 */
export function FieldShell({ label, errors, hint, children }: FieldShellOwnProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>

      {children}

      {hint && !errors?.length && <p className="text-xs text-gray-400">{hint}</p>}

      {errors?.map(_message => (
        <p key={`field_shell__error_${label}_${_message}`} className="text-xs font-medium text-red-600">
          {_message}
        </p>
      ))}
    </div>
  );
}

/**
 * Field isian teks satu baris. Seluruh atribut input HTML lain diteruskan apa
 * adanya ke elemen `<input>`.
 * @param {InputOwnProps} props - Props komponen.
 * @param {string} props.label - Label field.
 * @param {string[]} props.errors - Daftar pesan error field, opsional.
 * @param {string} props.hint - Petunjuk pengisian di bawah kontrol, opsional.
 * @param {string} props.className - Kelas tambahan yang digabung ke kelas bawaan.
 * @returns {ReactNode} Field input beserta label dan pesan errornya.
 */
export function Input({ label, errors, hint, className = '', ...rest }: InputOwnProps) {
  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <input {...rest} className={`${CONTROL_CLASS} ${getBorderClass(Boolean(errors?.length))} ${className}`} />
    </FieldShell>
  );
}

/**
 * Field pilihan dengan daftar opsi yang dapat dicari. Daftar ditutup saat
 * pengguna menekan Escape atau mengeklik di luar area komponen. Nilai terpilih
 * juga dicerminkan ke input tersembunyi bila `name` diisi, sehingga field ini
 * tetap terbawa saat form dikirim secara native.
 * @param {SelectOwnProps} props - Props komponen.
 * @param {string} props.label - Label field.
 * @param {string} props.value - Nilai opsi yang sedang terpilih, opsional.
 * @param {SelectOption[]} props.options - Daftar opsi yang tersedia.
 * @param {(value: string) => void} props.onChange - Dijalankan dengan nilai opsi yang baru dipilih.
 * @param {string} props.placeholder - Teks saat belum ada opsi terpilih, default `Pilih opsi`.
 * @param {string} props.searchPlaceholder - Teks pada kolom pencarian, default `Cari...`.
 * @param {string[]} props.errors - Daftar pesan error field, opsional.
 * @param {string} props.hint - Petunjuk pengisian di bawah kontrol, opsional.
 * @param {boolean} props.disabled - Nonaktifkan field bila true.
 * @param {boolean} props.searchable - Tampilkan kolom pencarian bila true, default true.
 * @param {boolean} props.regexSearch - Perlakukan kata kunci sebagai regex bila true, default true.
 * @param {string} props.name - Nama input tersembunyi untuk pengiriman form native, opsional.
 * @param {string} props.className - Kelas tambahan yang digabung ke kelas bawaan.
 * @returns {ReactNode} Field pilihan beserta daftar opsinya.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Pilih opsi',
  searchPlaceholder = 'Cari...',
  errors,
  hint,
  disabled = false,
  searchable = true,
  regexSearch = true,
  name,
  className = '',
}: SelectOwnProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find(_option => _option.value === value);
  const filteredOptions = useMemo(() => filterSelectOptions(options, search, regexSearch), [options, regexSearch, search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function handleSelect(option: SelectOption) {
    if (option.disabled) return;

    onChange(option.value);
    setOpen(false);
    setSearch('');
  }

  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <div ref={wrapperRef} className={`relative ${className}`}>
        {name && <input type="hidden" name={name} value={value ?? ''} />}

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(_previous => !_previous);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left outline-none transition-all duration-200 ${
            errors?.length ? 'border-red-300 focus:border-red-400' : open ? 'border-theme-accent ring-2 ring-theme-accent/10' : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer'}`}
        >
          <span className={`min-w-0 flex-1 truncate text-sm ${selectedOption ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{selectedOption?.label ?? placeholder}</span>

          <DynamicIcon icon="ph:caret-down" fontSize="16px" className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && !disabled && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60">
            {searchable && (
              <div className="border-b border-gray-100 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3">
                  <DynamicIcon icon="ph:magnifying-glass" fontSize="15px" className="shrink-0 text-gray-400" />

                  <input
                    autoFocus
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />

                  {search && (
                    <button type="button" onClick={() => setSearch('')} className="rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-200 hover:text-gray-600">
                      <DynamicIcon icon="ph:x" fontSize="14px" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div role="listbox" className="max-h-64 overflow-y-auto p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
                  <DynamicIcon icon="ph:magnifying-glass" fontSize="22px" className="text-gray-300" />

                  <p className="text-sm font-medium text-gray-500">Tidak ditemukan</p>

                  <p className="text-xs text-gray-400">Coba gunakan kata kunci lain.</p>
                </div>
              ) : (
                filteredOptions.map(_option => {
                  const isActive = _option.value === value;

                  return (
                    <button
                      key={`select__option_${label}_${_option.value}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      disabled={_option.disabled}
                      onClick={() => handleSelect(_option)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-theme-light text-gray-900' : 'text-gray-700 hover:bg-gray-50'} ${
                        _option.disabled ? 'cursor-not-allowed opacity-40' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{_option.label}</p>

                        {_option.description && <p className="mt-0.5 truncate text-xs text-gray-400">{_option.description}</p>}
                      </div>

                      {isActive && <DynamicIcon icon="ph:check" fontSize="16px" className="shrink-0 text-gray-700" />}
                    </button>
                  );
                })
              )}
            </div>

            {regexSearch && searchable && search && (
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="truncate font-mono text-[10px] text-gray-400">/{search}/i</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FieldShell>
  );
}
