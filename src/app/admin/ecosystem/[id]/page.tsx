"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Plus, Save, Trash2 } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ShowcaseLanding } from "@/components/ecosystem/ShowcaseLanding";
import { SHOWCASE_ICON_OPTIONS, ShowcaseIcon } from "@/components/ecosystem/ShowcaseIcon";
import type { ProductShowcaseDTO, ShowcaseFaq, ShowcaseFeature, ShowcasePlan } from "@/lib/ecosystem/types";
import { SHOWCASE_STATUSES } from "@/lib/ecosystem/types";
import toast from "react-hot-toast";

type Tab = "general" | "card" | "landing" | "gallery" | "faq" | "plans" | "labels" | "preview";

const emptyProduct = (): ProductShowcaseDTO => ({
  id: "",
  name: "",
  slug: "",
  status: "COMING_SOON",
  sortOrder: 0,
  isFeatured: false,
  icon: "Zap",
  themeColor: "#3b82f6",
  accentColor: "#60a5fa",
  shortDescription: "",
  longDescription: "",
  monthlyPrice: null,
  yearlyPrice: null,
  ctaText: "Keşfet",
  ctaUrl: "",
  productUrl: "",
  heroTitle: "",
  heroSubtitle: "",
  heroDescription: "",
  features: [],
  cardFeatures: [],
  faq: [],
  plans: [],
  gallery: [],
  badgeText: "",
  comingSoonText: "Yakında",
  featuresSectionTitle: "Özellikler",
  plansSectionTitle: "Paketler",
  faqSectionTitle: "Sık Sorulan Sorular",
  gallerySectionTitle: "Galeri",
  maxCardChips: 8,
  showPriceOnCard: false,
  linkTarget: "_self",
  createdAt: "",
  updatedAt: "",
});

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function EcosystemEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState<ProductShowcaseDTO>(emptyProduct());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [chipInput, setChipInput] = useState("");

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/ecosystem/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setForm(d.data);
        else toast.error("Ürün bulunamadı");
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const previewProduct = useMemo(() => form, [form]);

  const update = (patch: Partial<ProductShowcaseDTO>) => setForm((p) => ({ ...p, ...patch }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Ürün adı gerekli");
    setSaving(true);
    const payload = {
      ...form,
      cardFeatures: form.cardFeatures,
      features: form.features,
      faq: form.faq,
      plans: form.plans,
      gallery: form.gallery,
    };
    try {
      const r = isNew
        ? await fetch("/api/ecosystem/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/ecosystem/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) {
        toast.success("Kaydedildi");
        if (isNew) router.push(toAdminUrl(`/admin/ecosystem/${d.data.id}`));
        else setForm(d.data);
      } else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const addChip = () => {
    const v = chipInput.trim();
    if (!v) return;
    update({ cardFeatures: [...form.cardFeatures, v] });
    setChipInput("");
  };

  const addFeature = () => {
    update({ features: [...form.features, { title: "Yeni Özellik", description: "" }] });
  };

  const addFaq = () => {
    const item: ShowcaseFaq = { id: uid(), question: "", answer: "", sortOrder: form.faq.length, active: true };
    update({ faq: [...form.faq, item] });
  };

  const addPlan = () => {
    const item: ShowcasePlan = {
      id: uid(),
      name: "Yeni Plan",
      features: [],
      sortOrder: form.plans.length,
      ctaText: "Seç",
      ctaUrl: "",
    };
    update({ plans: [...form.plans, item] });
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Yükleniyor...</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "Genel" },
    { key: "card", label: "Kart" },
    { key: "landing", label: "Landing" },
    { key: "gallery", label: "Galeri" },
    { key: "labels", label: "Metinler" },
    { key: "faq", label: "FAQ" },
    { key: "plans", label: "Fiyatlandırma" },
    { key: "preview", label: "Önizleme" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin/ecosystem")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isNew ? "Yeni Ürün" : form.name}</h1>
            <p className="text-sm text-gray-500">Ekosistem Vitrini Yönetimi</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && form.slug && (
            <Link href={`/ecosystem/${form.slug}`} target="_blank" className="px-3 py-2 text-sm border rounded-lg flex items-center gap-1 hover:bg-gray-50">
              <Eye size={14} /> Canlı
            </Link>
          )}
          <button type="button" onClick={() => setTab("preview")} className="px-3 py-2 text-sm border rounded-lg flex items-center gap-1 hover:bg-gray-50">
            <Eye size={14} /> Önizleme
          </button>
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50">
            <Save size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "preview" ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <ShowcaseLanding product={previewProduct} preview />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {tab === "general" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Ürün Adı" value={form.name} onChange={(v) => update({ name: v, heroTitle: form.heroTitle || v })} />
              <Field label="Slug" value={form.slug} onChange={(v) => update({ slug: v })} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.status} onChange={(e) => update({ status: e.target.value as ProductShowcaseDTO["status"] })}>
                  {SHOWCASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => update({ isFeatured: e.target.checked })} /> Öne çıkan</label>
              </div>
              <Field label="Ürün URL" value={form.productUrl} onChange={(v) => update({ productUrl: v })} />
              <Field label="CTA URL" value={form.ctaUrl} onChange={(v) => update({ ctaUrl: v })} />
            </div>
          )}

          {tab === "card" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Kısa Açıklama (kart)" value={form.shortDescription} onChange={(v) => update({ shortDescription: v })} />
                <Field label="Rozet" value={form.badgeText} onChange={(v) => update({ badgeText: v })} />
                <Field label="CTA Metni" value={form.ctaText} onChange={(v) => update({ ctaText: v })} />
                <Field label="Aylık Fiyat" value={form.monthlyPrice?.toString() || ""} onChange={(v) => update({ monthlyPrice: v ? parseFloat(v) : null })} />
                <Field label="Yıllık Fiyat" value={form.yearlyPrice?.toString() || ""} onChange={(v) => update({ yearlyPrice: v ? parseFloat(v) : null })} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link Hedefi</label>
                  <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.linkTarget} onChange={(e) => update({ linkTarget: e.target.value })}>
                    <option value="_self">Aynı sekme</option>
                    <option value="_blank">Yeni sekme</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm pt-6">
                  <input type="checkbox" checked={form.showPriceOnCard} onChange={(e) => update({ showPriceOnCard: e.target.checked })} />
                  Kartta fiyat göster
                </label>
                <Field label="Max Chip Sayısı" value={String(form.maxCardChips)} onChange={(v) => update({ maxCardChips: parseInt(v) || 8 })} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">İkon</label>
                  <div className="flex gap-2 items-center">
                    <select className="flex-1 rounded-lg border px-3 py-2 text-sm" value={form.icon} onChange={(e) => update({ icon: e.target.value })}>
                      {SHOWCASE_ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <ShowcaseIcon name={form.icon} size={20} />
                  </div>
                </div>
                <Field label="Tema Rengi" type="color" value={form.themeColor} onChange={(v) => update({ themeColor: v })} />
                <Field label="Accent Rengi" type="color" value={form.accentColor} onChange={(v) => update({ accentColor: v })} />
              </div>
              <Field label="Uzun Açıklama" value={form.longDescription} onChange={(v) => update({ longDescription: v })} multiline />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Özellik Chipleri</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.cardFeatures.map((c, i) => (
                    <span key={`${c}-${i}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100">
                      {c}
                      <button type="button" onClick={() => update({ cardFeatures: form.cardFeatures.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-lg border px-3 py-2 text-sm" value={chipInput} onChange={(e) => setChipInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip())} placeholder="Yeni chip" />
                  <button type="button" onClick={addChip} className="px-3 py-2 text-sm border rounded-lg">Ekle</button>
                </div>
              </div>
            </div>
          )}

          {tab === "landing" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Hero Başlık" value={form.heroTitle} onChange={(v) => update({ heroTitle: v })} />
              <Field label="Hero Alt Başlık" value={form.heroSubtitle} onChange={(v) => update({ heroSubtitle: v })} />
              <div className="md:col-span-2">
                <Field label="Hero Açıklama" value={form.heroDescription} onChange={(v) => update({ heroDescription: v })} multiline />
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Landing Özellikleri</h3>
                <button type="button" onClick={addFeature} className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1"><Plus size={12} /> Özellik</button>
              </div>
              {form.features.map((f, i) => (
                <div key={i} className="md:col-span-2 grid md:grid-cols-2 gap-2 p-3 rounded-lg bg-gray-50 border">
                  <Field label="Başlık" value={f.title} onChange={(v) => {
                    const features = [...form.features];
                    features[i] = { ...features[i], title: v };
                    update({ features });
                  }} />
                  <Field label="Açıklama" value={f.description || ""} onChange={(v) => {
                    const features = [...form.features];
                    features[i] = { ...features[i], description: v };
                    update({ features });
                  }} />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">İkon</label>
                    <select className="w-full rounded-lg border px-3 py-2 text-sm" value={f.icon || ""} onChange={(e) => {
                      const features = [...form.features];
                      features[i] = { ...features[i], icon: e.target.value };
                      update({ features });
                    }}>
                      <option value="">Yok</option>
                      {SHOWCASE_ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => update({ features: form.features.filter((_, j) => j !== i) })} className="text-xs text-red-600 flex items-center gap-1"><Trash2 size={12} /> Sil</button>
                </div>
              ))}
            </div>
          )}

          {tab === "labels" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Yakında Metni" value={form.comingSoonText} onChange={(v) => update({ comingSoonText: v })} />
              <Field label="Özellikler Bölüm Başlığı" value={form.featuresSectionTitle} onChange={(v) => update({ featuresSectionTitle: v })} />
              <Field label="Paketler Bölüm Başlığı" value={form.plansSectionTitle} onChange={(v) => update({ plansSectionTitle: v })} />
              <Field label="FAQ Bölüm Başlığı" value={form.faqSectionTitle} onChange={(v) => update({ faqSectionTitle: v })} />
              <Field label="Galeri Bölüm Başlığı" value={form.gallerySectionTitle} onChange={(v) => update({ gallerySectionTitle: v })} />
            </div>
          )}

          {tab === "gallery" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Galeri Görselleri</h3>
                <button
                  type="button"
                  onClick={() => update({ gallery: [...form.gallery, { url: "", alt: "" }] })}
                  className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1"
                >
                  <Plus size={12} /> Görsel Ekle
                </button>
              </div>
              {form.gallery.map((item, i) => (
                <div key={i} className="p-4 rounded-lg border space-y-2 grid md:grid-cols-2 gap-2">
                  <Field label="Görsel URL" value={item.url} onChange={(v) => {
                    const gallery = [...form.gallery];
                    gallery[i] = { ...gallery[i], url: v };
                    update({ gallery });
                  }} />
                  <Field label="Alt Metin" value={item.alt || ""} onChange={(v) => {
                    const gallery = [...form.gallery];
                    gallery[i] = { ...gallery[i], alt: v };
                    update({ gallery });
                  }} />
                  <button type="button" onClick={() => update({ gallery: form.gallery.filter((_, j) => j !== i) })} className="text-xs text-red-600 md:col-span-2">Sil</button>
                </div>
              ))}
            </div>
          )}

          {tab === "faq" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">FAQ Builder</h3>
                <button type="button" onClick={addFaq} className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1"><Plus size={12} /> Soru Ekle</button>
              </div>
              {form.faq.map((item, i) => (
                <div key={item.id} className="p-4 rounded-lg border space-y-2">
                  <div className="flex justify-between gap-2">
                    <Field label="Soru" value={item.question} onChange={(v) => {
                      const faq = [...form.faq]; faq[i] = { ...faq[i], question: v }; update({ faq });
                    }} />
                    <label className="flex items-center gap-2 text-xs shrink-0 pt-5">
                      <input type="checkbox" checked={item.active} onChange={(e) => { const faq = [...form.faq]; faq[i] = { ...faq[i], active: e.target.checked }; update({ faq }); }} /> Aktif
                    </label>
                  </div>
                  <Field label="Cevap" value={item.answer} onChange={(v) => { const faq = [...form.faq]; faq[i] = { ...faq[i], answer: v }; update({ faq }); }} multiline />
                  <div className="flex gap-2 items-center">
                    <Field label="Sıra" value={String(item.sortOrder)} onChange={(v) => { const faq = [...form.faq]; faq[i] = { ...faq[i], sortOrder: parseInt(v) || 0 }; update({ faq }); }} />
                    <button type="button" onClick={() => update({ faq: form.faq.filter((_, j) => j !== i) })} className="text-xs text-red-600 mt-5">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "plans" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Pricing Builder</h3>
                <button type="button" onClick={addPlan} className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1"><Plus size={12} /> Plan Ekle</button>
              </div>
              {form.plans.map((plan, i) => (
                <div key={plan.id} className="p-4 rounded-lg border space-y-2">
                  <div className="grid md:grid-cols-2 gap-2">
                    <Field label="Plan Adı" value={plan.name} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], name: v }; update({ plans }); }} />
                    <Field label="Açıklama" value={plan.description || ""} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], description: v }; update({ plans }); }} />
                    <Field label="Aylık Fiyat" value={plan.monthlyPrice?.toString() || ""} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], monthlyPrice: v ? parseFloat(v) : undefined }; update({ plans }); }} />
                    <Field label="Yıllık Fiyat" value={plan.yearlyPrice?.toString() || ""} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], yearlyPrice: v ? parseFloat(v) : undefined }; update({ plans }); }} />
                    <Field label="CTA Metni" value={plan.ctaText || ""} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], ctaText: v }; update({ plans }); }} />
                    <Field label="CTA URL" value={plan.ctaUrl || ""} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], ctaUrl: v }; update({ plans }); }} />
                  </div>
                  <Field label="Özellikler (virgülle)" value={plan.features.join(", ")} onChange={(v) => { const plans = [...form.plans]; plans[i] = { ...plans[i], features: v.split(",").map((s) => s.trim()).filter(Boolean) }; update({ plans }); }} />
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!plan.highlighted} onChange={(e) => { const plans = [...form.plans]; plans[i] = { ...plans[i], highlighted: e.target.checked }; update({ plans }); }} /> Öne çıkan</label>
                    <button type="button" onClick={() => update({ plans: form.plans.filter((_, j) => j !== i) })} className="text-xs text-red-600">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, multiline, type = "text" }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline ? (
        <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} className="w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
