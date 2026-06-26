"use client";

import { Package, Printer, Truck, Factory } from "lucide-react";
import type { ProductEngineDto } from "@/lib/product-engine/types";

type Props = {
  products: ProductEngineDto[];
  onSelect: (p: ProductEngineDto) => void;
  loading?: boolean;
};

function Flag({ active, label, color }: { active: boolean; label: string; color: string }) {
  if (!active) return null;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

export function ProductEngineCardGrid({ products, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Filtrelere uygun ürün profili bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto min-h-0">
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p)}
          className="group text-left rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="aspect-[4/3] rounded-lg bg-gray-100 mb-3 overflow-hidden flex items-center justify-center">
            {p.media.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.media.cover} alt="" className="w-full h-full object-contain" />
            ) : (
              <Package className="h-8 w-8 text-gray-300" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-indigo-700">
                {p.identity.name}
              </h3>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  p.flags.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.flags.active ? "Aktif" : "Pasif"}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">{p.id}</p>
            <p className="text-xs text-gray-600">{p.identity.category}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Flag active={p.flags.pod} label="POD" color="bg-blue-100 text-blue-700" />
              <Flag active={p.flags.dropship} label="Dropship" color="bg-amber-100 text-amber-700" />
              <Flag active={p.flags.production} label="Üretim" color="bg-violet-100 text-violet-700" />
            </div>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
              {p.flags.pod && <span className="inline-flex items-center gap-0.5"><Printer className="h-3 w-3" /> {p.pricing.pricingRule}</span>}
              {p.flags.production && <span className="inline-flex items-center gap-0.5"><Factory className="h-3 w-3" /> {p.production.productionProfile}</span>}
              {p.flags.dropship && <span className="inline-flex items-center gap-0.5"><Truck className="h-3 w-3" /> Dropship</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
