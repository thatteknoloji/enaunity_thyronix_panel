"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { TRUST_BADGE_ICON_OPTIONS } from "@/components/products/ProductTrustBadges";
import type { TrustBadge } from "@/lib/products/presentation";

const CATEGORIES = [
  "Cam Tablo",
  "Mdf Tablo",
  "Halı",
  "Kilim",
  "Perde",
  "Nevresim",
  "Yastık Kılıfı",
  "Minder",
  "Puzzle",
  "Hediyelik Ürünler",
];

type CategoryForm = {
  category: string;
  badgeText: string;
  highlights: string[];
  trustBadges: TrustBadge[];
};

export default function ProductPresentationSettingsPage() {
  const ic =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultBadgeText, setDefaultBadgeText] = useState("B4B Ürün");
  const [showShortOnCatalog, setShowShortOnCatalog] = useState(true);
  const [siteTrustBadges, setSiteTrustBadges] = useState<TrustBadge[]>([]);
  const [categories, setCategories] = useState<CategoryForm[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [highlightInput, setHighlightInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/product-presentation/settings");
      const d = await r.json();
      if (!d.success) return toast.error(d.error || "Yüklenemedi");
      setDefaultBadgeText(d.data.defaultBadgeText || "B4B Ürün");
      setShowShortOnCatalog(d.data.showShortOnCatalog !== false);
      setSiteTrustBadges(d.data.trustBadges || []);
      const loaded: CategoryForm[] = (d.data.categories || []).map(
        (c: CategoryForm) => ({
          category: c.category,
          badgeText: c.badgeText || "",
          highlights: c.highlights || [],
          trustBadges: c.trustBadges || [],
        }),
      );
      const merged = CATEGORIES.map((cat) => {
        const existing = loaded.find((c) => c.category === cat);
        return existing || { category: cat, badgeText: "", highlights: [], trustBadges: [] };
      });
      setCategories(merged);
      setActiveCategory((prev) => prev || merged[0]?.category || "");
    } catch {
      toast.error("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = categories.find((c) => c.category === activeCategory);

  const updateActive = (patch: Partial<CategoryForm>) => {
    if (!activeCategory) return;
    setCategories((prev) =>
      prev.map((c) => (c.category === activeCategory ? { ...c, ...patch } : c)),
    );
  };

  const saveSite = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/product-presentation/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultBadgeText,
          trustBadges: siteTrustBadges.filter((b) => b.text.trim()),
          showShortOnCatalog,
        }),
      });
      const d = await r.json();
      if (d.success) toast.success("Site ayarları kaydedildi");
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    }
    setSaving(false);
  };

  const saveCategory = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const r = await fetch(
        `/api/admin/product-presentation/categories/${encodeURIComponent(active.category)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badgeText: active.badgeText,
            highlights: active.highlights,
            trustBadges: active.trustBadges.filter((b) => b.text.trim()),
          }),
        },
      );
      const d = await r.json();
      if (d.success) toast.success(`${active.category} kaydedildi`);
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse h-96 rounded-xl bg-gray-100" />;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href={toAdminUrl("/admin/products")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Ürünlere Dön
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ürün Sunum Ayarları</h1>
        <p className="text-sm text-gray-500 mt-1">
          Site geneli varsayılanlar ve kategori bazlı öne çıkan maddeler. Ürün düzenleme ekranından
          ürün özel override yapılabilir.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Site Geneli</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Varsayılan Rozet
            </label>
            <input
              className={ic}
              value={defaultBadgeText}
              onChange={(e) => setDefaultBadgeText(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showShortOnCatalog}
                onChange={(e) => setShowShortOnCatalog(e.target.checked)}
                className="rounded border-gray-300"
              />
              Katalog kartlarında kısa bilgi göster
            </label>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Güven Rozetleri (tüm ürünler)
            </label>
            <button
              type="button"
              onClick={() =>
                setSiteTrustBadges([...siteTrustBadges, { icon: "Truck", text: "" }])
              }
              className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
            >
              <Plus size={12} /> Ekle
            </button>
          </div>
          <div className="space-y-2">
            {siteTrustBadges.map((badge, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="w-32 rounded-lg border border-gray-200 px-2 py-2 text-xs"
                  value={badge.icon}
                  onChange={(e) => {
                    const next = [...siteTrustBadges];
                    next[i] = { ...next[i], icon: e.target.value };
                    setSiteTrustBadges(next);
                  }}
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
                  onChange={(e) => {
                    const next = [...siteTrustBadges];
                    next[i] = { ...next[i], text: e.target.value };
                    setSiteTrustBadges(next);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSiteTrustBadges(siteTrustBadges.filter((_, j) => j !== i))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <Button type="button" onClick={saveSite} disabled={saving}>
          <Save size={14} className="mr-1" /> Site Ayarlarını Kaydet
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Kategori Varsayılanları</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => setActiveCategory(c.category)}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                activeCategory === c.category
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              }`}
            >
              {c.category}
            </button>
          ))}
        </div>
        {active && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Kategori Rozeti
              </label>
              <input
                className={ic}
                value={active.badgeText}
                onChange={(e) => updateActive({ badgeText: e.target.value })}
                placeholder="Boş = site varsayılanı"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                Öne Çıkan Maddeler
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {active.highlights.map((h, i) => (
                  <span
                    key={`${h}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border rounded-full"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() =>
                        updateActive({
                          highlights: active.highlights.filter((_, j) => j !== i),
                        })
                      }
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = highlightInput.trim();
                      if (!t) return;
                      updateActive({ highlights: [...active.highlights, t] });
                      setHighlightInput("");
                    }
                  }}
                  placeholder="Madde ekle..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const t = highlightInput.trim();
                    if (!t) return;
                    updateActive({ highlights: [...active.highlights, t] });
                    setHighlightInput("");
                  }}
                  className="px-3 py-2 text-xs bg-gray-100 rounded-lg"
                >
                  Ekle
                </button>
              </div>
            </div>
            <Button type="button" onClick={saveCategory} disabled={saving}>
              <Save size={14} className="mr-1" /> {active.category} Kaydet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
