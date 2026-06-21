"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutTemplate, Plus, Sparkles, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  parseTrustBadges,
  serializeHighlights,
  serializeTrustBadges,
  type TrustBadge,
} from "@/lib/products/presentation";
import { TRUST_BADGE_ICON_OPTIONS } from "@/components/products/ProductTrustBadges";

export type ProductPresentationState = {
  subtitle: string;
  shortDescription: string;
  badgeText: string;
  highlights: string[];
  trustBadges: TrustBadge[];
};

export function defaultPresentationState(): ProductPresentationState {
  return {
    subtitle: "",
    shortDescription: "",
    badgeText: "",
    highlights: [],
    trustBadges: [],
  };
}

interface Props {
  value: ProductPresentationState;
  onChange: (next: ProductPresentationState) => void;
  category: string;
}

export function ProductPresentationPanel({ value, onChange, category }: Props) {
  const [highlightInput, setHighlightInput] = useState("");
  const ic =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  const patch = (partial: Partial<ProductPresentationState>) =>
    onChange({ ...value, ...partial });

  const addHighlight = () => {
    const t = highlightInput.trim();
    if (!t) return;
    if (value.highlights.includes(t)) return toast.error("Bu madde zaten var");
    patch({ highlights: [...value.highlights, t] });
    setHighlightInput("");
  };

  const loadCategoryDefaults = async () => {
    if (!category) return toast.error("Önce kategori seçin");
    try {
      const r = await fetch(
        `/api/admin/product-presentation/categories/${encodeURIComponent(category)}`,
      );
      const d = await r.json();
      if (!d.success) return toast.error(d.error || "Kategori varsayılanı yok");
      const data = d.data;
      patch({
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        badgeText: value.badgeText || data.badgeText || "",
        trustBadges:
          value.trustBadges.length > 0
            ? value.trustBadges
            : Array.isArray(data.trustBadges)
              ? data.trustBadges
              : [],
      });
      toast.success(`${category} varsayılanları yüklendi`);
    } catch {
      toast.error("Yüklenemedi");
    }
  };

  const updateTrustBadge = (index: number, partial: Partial<TrustBadge>) => {
    const next = value.trustBadges.map((b, i) => (i === index ? { ...b, ...partial } : b));
    patch({ trustBadges: next });
  };

  const addTrustBadge = () => {
    patch({ trustBadges: [...value.trustBadges, { icon: "Truck", text: "" }] });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <LayoutTemplate size={16} /> Mağaza Sunumu
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Boş bırakılan alanlar sitede gizlenir veya kategori / site varsayılanı kullanılır.
          </p>
        </div>
        <Link
          href={toAdminUrl("/admin/products/presentation")}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Site & kategori ayarları →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Alt Başlık
          </label>
          <input
            className={ic}
            value={value.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
            placeholder="Örn: Duvar dekorasyonu · 4mm temperli cam"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Rozet Metni
          </label>
          <input
            className={ic}
            value={value.badgeText}
            onChange={(e) => patch({ badgeText: e.target.value })}
            placeholder="Boş = kategori veya site varsayılanı"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
          Kısa Bilgi
        </label>
        <textarea
          className={ic}
          rows={2}
          maxLength={280}
          value={value.shortDescription}
          onChange={(e) => patch({ shortDescription: e.target.value })}
          placeholder="Başlık altında görünen 1–2 cümle (boşsa gösterilmez)"
        />
        <p className="text-[10px] text-gray-400 mt-1">{value.shortDescription.length}/280</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">
            Öne Çıkan Maddeler
          </label>
          <button
            type="button"
            onClick={loadCategoryDefaults}
            className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900"
          >
            <Sparkles size={12} /> Kategori varsayılanını yükle
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.highlights.map((h, i) => (
            <span
              key={`${h}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded-full"
            >
              {h}
              <button
                type="button"
                onClick={() => patch({ highlights: value.highlights.filter((_, j) => j !== i) })}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={ic}
            value={highlightInput}
            onChange={(e) => setHighlightInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHighlight())}
            placeholder="Madde ekle..."
          />
          <button
            type="button"
            onClick={addHighlight}
            className="shrink-0 px-3 py-2 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Ekle
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Ürün maddeleri boşsa kategori varsayılanları kullanılır.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">
            Güven Rozetleri (ürün özel)
          </label>
          <button
            type="button"
            onClick={addTrustBadge}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <Plus size={12} /> Rozet ekle
          </button>
        </div>
        {value.trustBadges.length === 0 ? (
          <p className="text-xs text-gray-400">
            Boş bırakılırsa kategori veya site geneli rozetler gösterilir.
          </p>
        ) : (
          <div className="space-y-2">
            {value.trustBadges.map((badge, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="w-32 rounded-lg border border-gray-200 px-2 py-2 text-xs"
                  value={badge.icon}
                  onChange={(e) => updateTrustBadge(i, { icon: e.target.value })}
                >
                  {TRUST_BADGE_ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <input
                  className={`${ic} flex-1`}
                  value={badge.text}
                  onChange={(e) => updateTrustBadge(i, { text: e.target.value })}
                  placeholder="Rozet metni"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch({ trustBadges: value.trustBadges.filter((_, j) => j !== i) })
                  }
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function presentationFromProduct(data: Record<string, unknown>): ProductPresentationState {
  let highlights: string[] = [];
  try {
    const parsed = JSON.parse(String(data.highlightsJson || "[]"));
    highlights = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    highlights = [];
  }
  return {
    subtitle: String(data.subtitle || ""),
    shortDescription: String(data.shortDescription || ""),
    badgeText: String(data.badgeText || ""),
    highlights,
    trustBadges: parseTrustBadges(data.trustBadgesJson),
  };
}

export function presentationToPayload(state: ProductPresentationState) {
  return {
    subtitle: state.subtitle.trim(),
    shortDescription: state.shortDescription.trim(),
    badgeText: state.badgeText.trim(),
    highlightsJson: serializeHighlights(state.highlights),
    trustBadgesJson: serializeTrustBadges(state.trustBadges),
  };
}
