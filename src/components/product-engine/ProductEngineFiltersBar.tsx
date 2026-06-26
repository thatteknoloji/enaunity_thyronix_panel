"use client";

import { Search, RefreshCw, Plus } from "lucide-react";

export type ProductEngineFiltersState = {
  category: string;
  productType: string;
  active: string;
  pod: string;
  dropship: string;
  production: string;
  search: string;
};

type Props = {
  filters: ProductEngineFiltersState;
  onChange: (patch: Partial<ProductEngineFiltersState>) => void;
  onRefresh: () => void;
  onCreate: () => void;
  loading?: boolean;
  categories: string[];
  productTypes: string[];
  total: number;
};

export function ProductEngineFiltersBar({
  filters,
  onChange,
  onRefresh,
  onCreate,
  loading,
  categories,
  productTypes,
  total,
}: Props) {
  return (
    <div className="space-y-3 shrink-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">ENA Katmanı</p>
          <h1 className="text-xl font-bold text-gray-900">Product Engine</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            POD · Pricing · Production · Dropship · Marketplace — ortak ürün profilleri
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Yenile
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" /> Özel Profil
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 shadow-sm">
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Ara</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-gray-400"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="İsim, SKU, kategori..."
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Kategori</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">Tümü</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Ürün Tipi</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.productType}
            onChange={(e) => onChange({ productType: e.target.value })}
          >
            <option value="">Tümü</option>
            {productTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Aktif</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.active}
            onChange={(e) => onChange({ active: e.target.value })}
          >
            <option value="">Tümü</option>
            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">POD</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.pod}
            onChange={(e) => onChange({ pod: e.target.value })}
          >
            <option value="">Tümü</option>
            <option value="1">POD</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Dropship</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.dropship}
            onChange={(e) => onChange({ dropship: e.target.value })}
          >
            <option value="">Tümü</option>
            <option value="1">Dropship</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Production</label>
          <select
            className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs"
            value={filters.production}
            onChange={(e) => onChange({ production: e.target.value })}
          >
            <option value="">Tümü</option>
            <option value="1">Üretim</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-500">{total} ürün profili</p>
    </div>
  );
}
