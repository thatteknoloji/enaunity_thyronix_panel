"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import toast from "react-hot-toast";
import type { ProductEngineDto, ProductEngineOverrides } from "@/lib/product-engine/types";

type Tab = "genel" | "pricing" | "pod" | "production" | "marketplace" | "seo" | "mockup";

const TABS: { key: Tab; label: string }[] = [
  { key: "genel", label: "Genel" },
  { key: "pricing", label: "Pricing" },
  { key: "pod", label: "POD" },
  { key: "production", label: "Production" },
  { key: "marketplace", label: "Marketplace" },
  { key: "seo", label: "SEO" },
  { key: "mockup", label: "Mockup" },
];

type Props = {
  product: ProductEngineDto | null;
  onClose: () => void;
  onUpdated: (p: ProductEngineDto) => void;
};

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</label>
      <p className="text-xs text-gray-800 font-mono bg-gray-50 rounded px-2 py-1.5">{value || "—"}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

export function ProductEngineDetailPanel({ product, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>("genel");
  const [draft, setDraft] = useState<ProductEngineDto | null>(product);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(product);
    setTab("genel");
  }, [product]);

  if (!product || !draft) return null;

  const patch = (overrides: ProductEngineOverrides) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        identity: { ...d.identity, ...overrides.identity },
        production: { ...d.production, ...overrides.production },
        pricing: { ...d.pricing, ...overrides.pricing },
        mockup: { ...d.mockup, ...overrides.mockup },
        media: { ...d.media, ...overrides.media },
        seo: { ...d.seo, ...overrides.seo },
        marketplace: overrides.marketplace
          ? {
              trendyol: { ...d.marketplace.trendyol, ...overrides.marketplace.trendyol },
              hepsiburada: { ...d.marketplace.hepsiburada, ...overrides.marketplace.hepsiburada },
              n11: { ...d.marketplace.n11, ...overrides.marketplace.n11 },
              ciceksepeti: { ...d.marketplace.ciceksepeti, ...overrides.marketplace.ciceksepeti },
            }
          : d.marketplace,
        pod: { ...d.pod, ...overrides.pod },
        flags: { ...d.flags, ...overrides.flags },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${draft.id}?engine=1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: true,
          overrides: {
            identity: draft.identity,
            production: draft.production,
            pricing: draft.pricing,
            mockup: draft.mockup,
            media: draft.media,
            seo: draft.seo,
            marketplace: draft.marketplace,
            pod: draft.pod,
            flags: draft.flags,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Kayıt başarısız");
      onUpdated(json.data);
      toast.success("Ürün profili güncellendi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  };

  const mpChannels = [
    { key: "trendyol" as const, label: "Trendyol" },
    { key: "hepsiburada" as const, label: "Hepsiburada" },
    { key: "n11" as const, label: "N11" },
    { key: "ciceksepeti" as const, label: "ÇiçekSepeti" },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div>
          <p className="text-[10px] font-semibold uppercase text-indigo-600">{draft.source}</p>
          <h2 className="text-lg font-bold text-gray-900">{draft.identity.name}</h2>
          <p className="text-xs text-gray-500 font-mono">{draft.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === "genel" && (
          <>
            <Field label="Ürün Adı" value={draft.identity.name} onChange={(v) => patch({ identity: { name: v } })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori" value={draft.identity.category} onChange={(v) => patch({ identity: { category: v } })} />
              <Field label="Alt Kategori" value={draft.identity.subCategory} onChange={(v) => patch({ identity: { subCategory: v } })} />
              <Field label="Ürün Tipi" value={draft.identity.productType} onChange={(v) => patch({ identity: { productType: v } })} />
              <Field label="Marka" value={draft.identity.brand} onChange={(v) => patch({ identity: { brand: v } })} />
              <Field label="SKU" value={draft.identity.sku} onChange={(v) => patch({ identity: { sku: v } })} mono />
              <Field label="Barkod" value={draft.identity.barcode} onChange={(v) => patch({ identity: { barcode: v } })} mono />
            </div>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
              <Toggle label="Aktif" checked={draft.flags.active} onChange={(v) => patch({ flags: { active: v } })} />
              <Toggle label="POD" checked={draft.flags.pod} onChange={(v) => patch({ flags: { pod: v } })} />
              <Toggle label="Dropship" checked={draft.flags.dropship} onChange={(v) => patch({ flags: { dropship: v } })} />
              <Toggle label="Production" checked={draft.flags.production} onChange={(v) => patch({ flags: { production: v } })} />
            </div>
          </>
        )}

        {tab === "pricing" && (
          <div className="grid grid-cols-1 gap-3">
            <Readonly label="Pricing Catalog" value={draft.pricing.pricingCatalog} />
            <Field label="Pricing Rule" value={draft.pricing.pricingRule} onChange={(v) => patch({ pricing: { pricingRule: v } })} mono />
            <Field label="Marketplace Rule" value={draft.pricing.marketplaceRule} onChange={(v) => patch({ pricing: { marketplaceRule: v } })} mono />
            <Field label="Dealer Rule" value={draft.pricing.dealerRule} onChange={(v) => patch({ pricing: { dealerRule: v } })} mono />
            <Field label="Retail Rule" value={draft.pricing.retailRule} onChange={(v) => patch({ pricing: { retailRule: v } })} mono />
          </div>
        )}

        {tab === "pod" && (
          <div className="grid grid-cols-1 gap-3">
            <Readonly label="Template ID" value={draft.pod.templateId} />
            <Readonly label="Template Type" value={draft.pod.templateType} />
            <Readonly label="Variant ID" value={draft.pod.variantId} />
            <Readonly label="Print Area Mode" value={draft.pod.printAreaMode} />
            <Readonly label="Editor Plugin" value={draft.pod.editorPlugin} />
            <Readonly label="Print Area" value={draft.production.printArea} />
            <Toggle label="Overlay Görünür" checked={draft.pod.overlayVisible} onChange={(v) => patch({ pod: { overlayVisible: v } })} />
            <Field label="Export Crop" value={draft.pod.exportCrop} onChange={(v) => patch({ pod: { exportCrop: v } })} />
            <Toggle label="Production Pack" checked={draft.pod.productionPackEnabled} onChange={(v) => patch({ pod: { productionPackEnabled: v } })} />
          </div>
        )}

        {tab === "production" && (
          <div className="grid grid-cols-1 gap-3">
            <Readonly label="Print Area" value={draft.production.printArea} />
            <Readonly label="Safe Area" value={draft.production.safeArea} />
            <Readonly label="Bleed" value={draft.production.bleed} />
            <Readonly label="Export Mode" value={draft.production.exportMode} />
            <Readonly label="DPI" value={String(draft.production.dpi)} />
            <Readonly label="Shape" value={draft.production.shape} />
            <Readonly label="Mockup Type" value={draft.production.mockupType} />
            <Field label="Production Profile" value={draft.production.productionProfile} onChange={(v) => patch({ production: { productionProfile: v } })} />
            <Field label="Makine Notu" value={draft.production.machineNotes} onChange={(v) => patch({ production: { machineNotes: v } })} />
            <Field label="Üretim Notları" value={draft.production.productionNotes} onChange={(v) => patch({ production: { productionNotes: v } })} />
            <Field label="Paketleme Tipi" value={draft.production.packagingType} onChange={(v) => patch({ production: { packagingType: v } })} />
          </div>
        )}

        {tab === "marketplace" && (
          <div className="space-y-4">
            {mpChannels.map(({ key, label }) => {
              const ch = draft.marketplace[key];
              return (
                <div key={key} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800">{label}</h4>
                    <Toggle
                      label="Aktif"
                      checked={ch.enabled}
                      onChange={(v) => patch({ marketplace: { [key]: { enabled: v } } })}
                    />
                  </div>
                  <Field label="Kategori ID" value={ch.categoryId} onChange={(v) => patch({ marketplace: { [key]: { categoryId: v } } })} />
                  <Field label="Kategori" value={ch.categoryLabel} onChange={(v) => patch({ marketplace: { [key]: { categoryLabel: v } } })} />
                  <Field label="Komisyon %" value={String(ch.commissionPercent)} onChange={(v) => patch({ marketplace: { [key]: { commissionPercent: parseFloat(v) || 0 } } })} />
                  <Field label="Kargo Profili" value={ch.cargoProfile} onChange={(v) => patch({ marketplace: { [key]: { cargoProfile: v } } })} />
                </div>
              );
            })}
          </div>
        )}

        {tab === "seo" && (
          <div className="grid grid-cols-1 gap-3">
            <Field label="SEO Başlık" value={draft.seo.title} onChange={(v) => patch({ seo: { title: v } })} />
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">SEO Açıklama</label>
              <textarea
                value={draft.seo.description}
                onChange={(e) => patch({ seo: { description: e.target.value } })}
                rows={3}
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400"
              />
            </div>
            <Field label="Slug" value={draft.seo.slug} onChange={(v) => patch({ seo: { slug: v } })} mono />
            <Field label="Etiketler (virgülle)" value={draft.seo.tags.join(", ")} onChange={(v) => patch({ seo: { tags: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
            <Field label="Anahtar Kelimeler (virgülle)" value={draft.seo.keywords.join(", ")} onChange={(v) => patch({ seo: { keywords: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
          </div>
        )}

        {tab === "mockup" && (
          <div className="grid grid-cols-1 gap-3">
            <Field label="Ön Mockup URL" value={draft.mockup.front} onChange={(v) => patch({ mockup: { front: v } })} />
            <Field label="Arka Mockup URL" value={draft.mockup.back} onChange={(v) => patch({ mockup: { back: v } })} />
            <Field label="Detay Mockup URL" value={draft.mockup.detail} onChange={(v) => patch({ mockup: { detail: v } })} />
            <Field label="Lifestyle Mockup URL" value={draft.mockup.lifestyle} onChange={(v) => patch({ mockup: { lifestyle: v } })} />
            <Field label="Şablonlar (virgülle)" value={draft.mockup.templates.join(", ")} onChange={(v) => patch({ mockup: { templates: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
            <Field label="Kapak" value={draft.media.cover} onChange={(v) => patch({ media: { cover: v } })} />
            <Field label="Thumbnail" value={draft.media.thumbnail} onChange={(v) => patch({ media: { thumbnail: v } })} />
            <Field label="SEO Görseli" value={draft.media.seoImage} onChange={(v) => patch({ media: { seoImage: v } })} />
          </div>
        )}
      </div>
    </div>
  );
}
