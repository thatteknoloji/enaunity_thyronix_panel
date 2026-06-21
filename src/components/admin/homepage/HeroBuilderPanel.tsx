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
} from "lucide-react";
import toast from "react-hot-toast";
import type { HomepageHeroDTO } from "@/lib/homepage/service";
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
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
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
  title: "ENAUNITY",
  subtitle: "İşletmeniz için toptan çözümler. Binlerce ürün, kurumsal fiyatlar, tek tıkla tedarik.",
  backgroundImageUrl: "",
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
    title: h.title,
    subtitle: h.subtitle,
    backgroundImageUrl: h.backgroundImageUrl,
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

export function HeroBuilderPanel() {
  const [heroes, setHeroes] = useState<HomepageHeroDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroForm>({ ...EMPTY_HERO, buttons: EMPTY_HERO.buttons.map((b) => ({ ...b })) });
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
    setForm({ ...EMPTY_HERO, buttons: EMPTY_HERO.buttons.map((b) => ({ ...b })) });
  };

  const editHero = (h: HomepageHeroDTO) => {
    setEditingId(h.id);
    setForm(heroToForm(h));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveHero = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
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
    const d = await r.json();
    if (d.success) {
      toast.success(h.isActive ? "Hero pasife alındı" : "Hero aktifleştirildi");
      await load();
    }
  };

  const deleteHero = async (id: string) => {
    if (!confirm("Bu hero silinsin mi?")) return;
    const r = await fetch(`/api/admin/homepage/heroes/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      toast.success("Hero silindi");
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
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">
              {editingId ? "Hero Düzenle" : "Yeni Hero Ekle"}
            </h3>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs text-gray-500 hover:underline">
                Yeni hero
              </button>
            )}
          </div>

          <input
            placeholder="Üst metin (eyebrow) — örn. B4B Alışveriş Platformu"
            value={form.eyebrowText}
            onChange={(e) => setForm((f) => ({ ...f, eyebrowText: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            placeholder="Başlık — örn. ENAUNITY"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Alt başlık / açıklama"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />

          <MediaUploadField
            label="Arka plan görseli"
            value={form.backgroundImageUrl}
            onChange={(v) => setForm((f) => ({ ...f, backgroundImageUrl: v }))}
            kind="hero"
            maxBytes={(MEDIA_SPECS.hero.poster.maxKb ?? 500) * 1024}
          />

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Overlay opaklığı ({form.overlayOpacity.toFixed(2)})</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.overlayOpacity}
              onChange={(e) => setForm((f) => ({ ...f, overlayOpacity: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Aktif (public ana sayfada göster)
          </label>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Butonlar</h4>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, buttons: [...f.buttons, { ...EMPTY_BUTTON, sortOrder: f.buttons.length }] }))}
                className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Plus size={12} /> Buton ekle
              </button>
            </div>

            {form.buttons.map((btn, idx) => (
              <div key={btn.id || idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-500">Buton {idx + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveButton(idx, -1)} className="p-1 hover:bg-white rounded"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => moveButton(idx, 1)} className="p-1 hover:bg-white rounded"><ChevronDown size={14} /></button>
                    <button
                      type="button"
                      onClick={() => updateButton(idx, { isActive: !btn.isActive })}
                      className="p-1 hover:bg-white rounded"
                      title={btn.isActive ? "Pasife al" : "Aktifleştir"}
                    >
                      {btn.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }))}
                      className="p-1 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    placeholder="Etiket"
                    value={btn.label}
                    onChange={(e) => updateButton(idx, { label: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Link (href)"
                    value={btn.href}
                    onChange={(e) => updateButton(idx, { href: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <select
                    value={btn.icon}
                    onChange={(e) => updateButton(idx, { icon: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                  <select
                    value={btn.variant}
                    onChange={(e) => updateButton(idx, { variant: e.target.value as ButtonForm["variant"] })}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="ghost">Ghost</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveHero}
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Kaydediliyor..." : editingId ? "Hero Güncelle" : "Hero Kaydet"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-700">Önizleme</div>
          <div className="relative min-h-[280px] bg-ena-dark overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-ena-dark via-ena-dark/70 to-ena-dark/50 z-10" style={{ opacity: form.overlayOpacity }} />
            {form.backgroundImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
            )}
            <div className="relative z-20 p-6 text-white">
              <p className="text-[10px] uppercase tracking-widest text-red-500 mb-2">{form.eyebrowText || "Eyebrow"}</p>
              <h2 className="text-3xl font-black">{form.title || "ENAUNITY"}</h2>
              <p className="mt-2 text-sm text-gray-300 max-w-md">{form.subtitle || "Alt başlık metni"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {form.buttons.filter((b) => b.isActive && b.label).map((b, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded text-xs font-medium ${b.variant === "primary" ? "bg-red-600" : "border border-white/30"}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2 text-sm font-medium text-gray-700">
            <GripVertical size={14} /> Kayıtlı herolar ({heroes.length})
          </div>
          {heroes.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">
              Henüz hero yok. Aktif hero olmadığında mevcut varsayılan hero gösterilir.
            </p>
          ) : (
            <div className="divide-y">
              {heroes.map((h) => (
                <div
                  key={h.id}
                  draggable
                  onDragStart={() => setDragId(h.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(h.id)}
                  className={`p-4 flex gap-3 items-start ${dragId === h.id ? "opacity-50 bg-gray-50" : ""}`}
                >
                  <GripVertical size={16} className="text-gray-300 shrink-0 mt-1 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{h.title || "Başlıksız hero"}</p>
                    <p className="text-xs text-gray-400 truncate">{h.eyebrowText || "—"} · {h.buttons.filter((b) => b.isActive).length} buton</p>
                    <p className="text-xs mt-0.5">
                      {h.isActive ? <span className="text-green-700">Aktif</span> : <span className="text-gray-400">Pasif</span>}
                      {" · "}Sıra: {h.sortOrder}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => editHero(h)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Düzenle</button>
                    <button type="button" onClick={() => toggleActive(h)} className="p-1 hover:bg-gray-100 rounded">{h.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    <button type="button" onClick={() => deleteHero(h.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 bg-amber-50 text-xs text-amber-900 border-t">
            Birden fazla aktif hero varsa public tarafta sıralamada ilk olan gösterilir.
          </div>
        </div>
      </div>
    </div>
  );
}
