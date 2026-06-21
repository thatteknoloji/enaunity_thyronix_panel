"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Palette,
} from "lucide-react";
import toast from "react-hot-toast";
import type { HomepageHeroDTO } from "@/lib/homepage/service";
import {
  DEFAULT_TITLE_SEGMENTS,
  HERO_ALIGN_OPTIONS,
  HERO_FONT_OPTIONS,
  HERO_HEIGHT_OPTIONS,
  HERO_TITLE_SIZE_OPTIONS,
  getHeroFontClass,
  getHeroHeightClass,
  getHeroTitleSizeClass,
  titleFromSegments,
  type HeroTitleSegment,
} from "@/lib/homepage/hero-presets";
import { MediaUploadField } from "@/components/admin/homepage/MediaUploadField";
import { MEDIA_SPECS } from "@/lib/homepage/media-specs";

type ButtonForm = {
  id?: string;
  label: string;
  href: string;
  icon: string;
  variant: "primary" | "secondary" | "ghost";
  isActive: boolean;
  sortOrder: number;
};

type HeroForm = {
  eyebrowText: string;
  subtitle: string;
  titleSegments: HeroTitleSegment[];
  titleFont: string;
  eyebrowFont: string;
  subtitleFont: string;
  showTrademark: boolean;
  eyebrowColor: string;
  subtitleColor: string;
  titleSize: string;
  textAlign: string;
  heroHeight: string;
  backgroundImageUrl: string;
  backgroundImageMobileUrl: string;
  overlayOpacity: number;
  isActive: boolean;
  buttons: ButtonForm[];
};

const EMPTY_BUTTON: ButtonForm = {
  label: "",
  href: "/catalog",
  icon: "Play",
  variant: "primary",
  isActive: true,
  sortOrder: 0,
};

const EMPTY_HERO: HeroForm = {
  eyebrowText: "B4B Alışveriş Platformu",
  subtitle: "İşletmeniz için toptan çözümler. Binlerce ürün, kurumsal fiyatlar, tek tıkla tedarik.",
  titleSegments: DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s })),
  titleFont: "geist-black",
  eyebrowFont: "geist-sans",
  subtitleFont: "geist-sans",
  showTrademark: true,
  eyebrowColor: "#e50914",
  subtitleColor: "",
  titleSize: "xl",
  textAlign: "left",
  heroHeight: "lg",
  backgroundImageUrl: "",
  backgroundImageMobileUrl: "",
  overlayOpacity: 0.5,
  isActive: true,
  buttons: [
    { ...EMPTY_BUTTON, label: "Kataloğu İncele", href: "/catalog", icon: "Play", sortOrder: 0 },
    { ...EMPTY_BUTTON, label: "B4B Hesap Aç", href: "/auth/register", icon: "Building2", variant: "secondary", sortOrder: 1 },
  ],
};

const ICON_OPTIONS = ["Play", "Building2", "ChevronRight", "ArrowRight"];

function heroToForm(h: HomepageHeroDTO): HeroForm {
  return {
    eyebrowText: h.eyebrowText,
    subtitle: h.subtitle,
    titleSegments: h.titleSegments.length ? h.titleSegments.map((s) => ({ ...s })) : DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s })),
    titleFont: h.titleFont,
    eyebrowFont: h.eyebrowFont,
    subtitleFont: h.subtitleFont,
    showTrademark: h.showTrademark,
    eyebrowColor: h.eyebrowColor,
    subtitleColor: h.subtitleColor,
    titleSize: h.titleSize,
    textAlign: h.textAlign,
    heroHeight: h.heroHeight,
    backgroundImageUrl: h.backgroundImageUrl,
    backgroundImageMobileUrl: h.backgroundImageMobileUrl,
    overlayOpacity: h.overlayOpacity,
    isActive: h.isActive,
    buttons: h.buttons.map((b) => ({
      id: b.id,
      label: b.label,
      href: b.href,
      icon: b.icon,
      variant: b.variant,
      isActive: b.isActive,
      sortOrder: b.sortOrder,
    })),
  };
}

function HeroPreview({ form }: { form: HeroForm }) {
  const heightClass = getHeroHeightClass(form.heroHeight);
  const sizeClass = getHeroTitleSizeClass(form.titleSize);
  const align = form.textAlign === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`relative bg-ena-dark overflow-hidden ${heightClass} min-h-[280px]`}>
      <div className="absolute inset-0 bg-gradient-to-r from-ena-dark via-ena-dark/70 to-ena-dark/50 z-10" style={{ opacity: form.overlayOpacity }} />
      {form.backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
      )}
      <div className={`relative z-20 p-6 text-white flex flex-col justify-center h-full min-h-[280px] ${align}`}>
        <p
          className={`text-[10px] uppercase tracking-widest mb-2 ${getHeroFontClass(form.eyebrowFont)}`}
          style={{ color: form.eyebrowColor }}
        >
          {form.eyebrowText || "Eyebrow"}
        </p>
        <h2 className={`${sizeClass} ${getHeroFontClass(form.titleFont)}`}>
          {form.titleSegments.map((seg, i) => (
            <span
              key={i}
              style={{ color: seg.color }}
              className={i === form.titleSegments.length - 1 && form.showTrademark ? "relative" : undefined}
            >
              {seg.text}
              {i === form.titleSegments.length - 1 && form.showTrademark && (
                <sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em]">®</sup>
              )}
            </span>
          ))}
        </h2>
        <p
          className={`mt-2 text-sm max-w-md ${getHeroFontClass(form.subtitleFont)} ${form.subtitleColor ? "" : "text-gray-300"}`}
          style={form.subtitleColor ? { color: form.subtitleColor } : undefined}
        >
          {form.subtitle || "Alt başlık"}
        </p>
        <div className={`mt-4 flex flex-wrap gap-2 ${form.textAlign === "center" ? "justify-center" : ""}`}>
          {form.buttons.filter((b) => b.isActive && b.label).map((b, i) => (
            <span key={i} className={`px-3 py-1.5 rounded text-xs font-medium ${b.variant === "primary" ? "bg-red-600" : "border border-white/30"}`}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroBuilderPanel() {
  const [heroes, setHeroes] = useState<HomepageHeroDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroForm>({ ...EMPTY_HERO, buttons: EMPTY_HERO.buttons.map((b) => ({ ...b })), titleSegments: DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s })) });
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/homepage/heroes");
    const d = await r.json();
    if (d.success) setHeroes(d.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_HERO,
      buttons: EMPTY_HERO.buttons.map((b) => ({ ...b })),
      titleSegments: DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s })),
    });
  };

  const editHero = (h: HomepageHeroDTO) => {
    setEditingId(h.id);
    setForm(heroToForm(h));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateSegment = (idx: number, patch: Partial<HeroTitleSegment>) => {
    setForm((f) => ({
      ...f,
      titleSegments: f.titleSegments.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const saveHero = async () => {
    if (!form.titleSegments.some((s) => s.text.trim())) {
      toast.error("En az bir başlık segmenti gerekli");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: titleFromSegments(form.titleSegments),
        buttons: form.buttons.map((b, i) => ({ ...b, sortOrder: i })),
      };
      const r = editingId
        ? await fetch(`/api/admin/homepage/heroes/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/homepage/heroes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await r.json();
      if (d.success) {
        toast.success(editingId ? "Hero güncellendi" : "Hero eklendi");
        resetForm();
        await load();
      } else {
        toast.error(d.error || "Kaydedilemedi");
      }
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (h: HomepageHeroDTO) => {
    const r = await fetch(`/api/admin/homepage/heroes/${h.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !h.isActive }),
    });
    if ((await r.json()).success) {
      toast.success(h.isActive ? "Pasife alındı" : "Aktifleştirildi");
      await load();
    }
  };

  const deleteHero = async (id: string) => {
    if (!confirm("Bu hero silinsin mi?")) return;
    if ((await fetch(`/api/admin/homepage/heroes/${id}`, { method: "DELETE" })).ok) {
      toast.success("Silindi");
      if (editingId === id) resetForm();
      await load();
    }
  };

  const reorder = async (ids: string[]) => {
    const r = await fetch("/api/admin/homepage/heroes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, ids }),
    });
    const d = await r.json();
    if (d.success) {
      setHeroes(d.data);
      toast.success("Sıralama kaydedildi");
    }
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = heroes.findIndex((h) => h.id === dragId);
    const to = heroes.findIndex((h) => h.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...heroes];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    setHeroes(next);
    void reorder(next.map((h) => h.id));
  };

  const updateButton = (idx: number, patch: Partial<ButtonForm>) => {
    setForm((f) => ({ ...f, buttons: f.buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));
  };

  const moveButton = (idx: number, dir: -1 | 1) => {
    const next = [...form.buttons];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setForm((f) => ({ ...f, buttons: next }));
  };

  if (loading) return <p className="text-gray-400 py-8">Yükleniyor...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{editingId ? "Hero Düzenle" : "Yeni Hero"}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, titleSegments: DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s })), showTrademark: true }))}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              >
                ENAUNITY preset
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs text-gray-500 hover:underline">Yeni</button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Eyebrow metni</label>
              <input value={form.eyebrowText} onChange={(e) => setForm((f) => ({ ...f, eyebrowText: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Eyebrow rengi</label>
              <input type="color" value={form.eyebrowColor} onChange={(e) => setForm((f) => ({ ...f, eyebrowColor: e.target.value }))} className="mt-1 h-10 w-full rounded border cursor-pointer" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Eyebrow font</label>
              <select value={form.eyebrowFont} onChange={(e) => setForm((f) => ({ ...f, eyebrowFont: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                {HERO_FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1"><Palette size={14} /> Başlık segmentleri</h4>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, titleSegments: [...f.titleSegments, { text: "", color: "#ffffff" }] }))}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Segment
              </button>
            </div>
            {form.titleSegments.map((seg, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <input
                  placeholder="Metin"
                  value={seg.text}
                  onChange={(e) => updateSegment(idx, { text: e.target.value })}
                  className="rounded border px-2 py-1.5 text-sm"
                />
                <input type="color" value={seg.color} onChange={(e) => updateSegment(idx, { color: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" title="Renk" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, titleSegments: f.titleSegments.filter((_, i) => i !== idx) }))} className="p-1 text-red-500 hover:bg-red-50 rounded" disabled={form.titleSegments.length <= 1}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showTrademark} onChange={(e) => setForm((f) => ({ ...f, showTrademark: e.target.checked }))} />
              ® göster (son segmentte)
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Başlık font</label>
                <select value={form.titleFont} onChange={(e) => setForm((f) => ({ ...f, titleFont: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {HERO_FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Başlık boyutu</label>
                <select value={form.titleSize} onChange={(e) => setForm((f) => ({ ...f, titleSize: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {HERO_TITLE_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <textarea placeholder="Alt başlık" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Alt başlık rengi</label>
              <input type="color" value={form.subtitleColor || "#cbd5e1"} onChange={(e) => setForm((f) => ({ ...f, subtitleColor: e.target.value }))} className="mt-1 h-10 w-full rounded border cursor-pointer" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Alt başlık font</label>
              <select value={form.subtitleFont} onChange={(e) => setForm((f) => ({ ...f, subtitleFont: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                {HERO_FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Hizalama</label>
              <select value={form.textAlign} onChange={(e) => setForm((f) => ({ ...f, textAlign: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                {HERO_ALIGN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Yükseklik</label>
              <select value={form.heroHeight} onChange={(e) => setForm((f) => ({ ...f, heroHeight: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                {HERO_HEIGHT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Overlay ({form.overlayOpacity.toFixed(2)})</label>
              <input type="range" min={0} max={1} step={0.05} value={form.overlayOpacity} onChange={(e) => setForm((f) => ({ ...f, overlayOpacity: Number(e.target.value) }))} className="mt-3 w-full" />
            </div>
          </div>

          <MediaUploadField label="Arka plan (masaüstü)" value={form.backgroundImageUrl} onChange={(v) => setForm((f) => ({ ...f, backgroundImageUrl: v }))} kind="hero" maxBytes={(MEDIA_SPECS.hero.poster.maxKb ?? 500) * 1024} />
          <MediaUploadField label="Arka plan (mobil — boş = masaüstü)" value={form.backgroundImageMobileUrl} onChange={(v) => setForm((f) => ({ ...f, backgroundImageMobileUrl: v }))} kind="hero" maxBytes={(MEDIA_SPECS.hero.poster.maxKb ?? 500) * 1024} />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Aktif hero
          </label>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Butonlar</h4>
              <button type="button" onClick={() => setForm((f) => ({ ...f, buttons: [...f.buttons, { ...EMPTY_BUTTON, sortOrder: f.buttons.length }] }))} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12} /> Ekle</button>
            </div>
            {form.buttons.map((btn, idx) => (
              <div key={btn.id || idx} className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Buton {idx + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveButton(idx, -1)} className="p-1 hover:bg-white rounded"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => moveButton(idx, 1)} className="p-1 hover:bg-white rounded"><ChevronDown size={14} /></button>
                    <button type="button" onClick={() => updateButton(idx, { isActive: !btn.isActive })} className="p-1 hover:bg-white rounded">{btn.isActive ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }))} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input placeholder="Etiket" value={btn.label} onChange={(e) => updateButton(idx, { label: e.target.value })} className="rounded border px-2 py-1.5 text-sm" />
                  <input placeholder="URL" value={btn.href} onChange={(e) => updateButton(idx, { href: e.target.value })} className="rounded border px-2 py-1.5 text-sm" />
                  <select value={btn.icon} onChange={(e) => updateButton(idx, { icon: e.target.value })} className="rounded border px-2 py-1.5 text-sm">{ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select>
                  <select value={btn.variant} onChange={(e) => updateButton(idx, { variant: e.target.value as ButtonForm["variant"] })} className="rounded border px-2 py-1.5 text-sm">
                    <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="ghost">Ghost</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={saveHero} disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50">
            <Save size={14} /> {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b text-sm font-medium">Canlı önizleme</div>
          <HeroPreview form={form} />
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2 text-sm font-medium"><GripVertical size={14} /> Herolar ({heroes.length})</div>
          {heroes.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">Henüz hero yok.</p>
          ) : (
            <div className="divide-y">
              {heroes.map((h) => (
                <div key={h.id} draggable onDragStart={() => setDragId(h.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(h.id)} className={`p-4 flex gap-3 ${dragId === h.id ? "opacity-50 bg-gray-50" : ""}`}>
                  <GripVertical size={16} className="text-gray-300 shrink-0 mt-1 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{titleFromSegments(h.titleSegments) || h.title}</p>
                    <p className="text-xs text-gray-400">{h.titleSegments.length} segment · {h.isActive ? "Aktif" : "Pasif"}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => editHero(h)} className="px-2 py-1 text-xs border rounded">Düzenle</button>
                    <button type="button" onClick={() => toggleActive(h)} className="p-1 hover:bg-gray-100 rounded">{h.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    <button type="button" onClick={() => deleteHero(h.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
