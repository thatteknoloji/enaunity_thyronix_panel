"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, GripVertical, Plus, Save, Trash2, Image as ImageIcon,
  ChevronUp, ChevronDown, Eye, EyeOff, Layout, Video, Clock, Calendar, Tag,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import toast from "react-hot-toast";
import type { HomeBannerDTO, HomeBannerSlotDTO, HomeHeroDTO } from "@/lib/homepage/service";
import { MediaSpecGuide } from "@/components/admin/homepage/MediaSpecGuide";
import { MediaUploadField } from "@/components/admin/homepage/MediaUploadField";
import { BANNER_DISPLAY_MODES, MEDIA_SPECS, PAGE_PLACEMENTS } from "@/lib/homepage/media-specs";
import { DEFAULT_HERO } from "@/lib/homepage/defaults";
import { HeroBuilderPanel } from "@/components/admin/homepage/HeroBuilderPanel";

type CategoryRow = {
  id: string;
  categoryName: string;
  title: string;
  sortOrder: number;
  maxProducts: number;
  active: boolean;
};

type AdminData = {
  categories: CategoryRow[];
  slots: HomeBannerSlotDTO[];
  availableCategories: string[];
  hero: HomeHeroDTO;
};

const EMPTY_BANNER_FORM = {
  title: "",
  imageDesktop: "",
  imageTablet: "",
  imageMobile: "",
  linkUrl: "",
  linkTarget: "_self",
  startsAt: "",
  endsAt: "",
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSchedule(b: HomeBannerDTO) {
  if (!b.startsAt && !b.endsAt) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  if (b.startsAt && b.endsAt) return `${fmt(b.startsAt)} → ${fmt(b.endsAt)}`;
  if (b.startsAt) return `${fmt(b.startsAt)}'den itibaren`;
  return `${fmt(b.endsAt!)}'e kadar`;
}

function isScheduledLive(b: HomeBannerDTO) {
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return "upcoming";
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return "expired";
  return "live";
}

export default function AdminHomepagePage() {
  const [tab, setTab] = useState<"categories" | "banners" | "hero" | "heroBuilder">("categories");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragCatId, setDragCatId] = useState<string | null>(null);
  const [dragBannerId, setDragBannerId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("after_hero");
  const [newCat, setNewCat] = useState("");
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const [heroForm, setHeroForm] = useState<HomeHeroDTO>(DEFAULT_HERO);
  const [savingHero, setSavingHero] = useState(false);
  const [showNewSlot, setShowNewSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ key: "", label: "", placement: "after_hero", displayMode: "carousel", gridColumns: 2 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/homepage");
      const d = await r.json();
      if (d.success) {
        setData(d.data);
        if (d.data.hero) setHeroForm(d.data.hero);
        setSelectedSlot((prev) => {
          const keys = d.data.slots?.map((s: HomeBannerSlotDTO) => s.key) || [];
          return keys.includes(prev) ? prev : keys[0] || "after_hero";
        });
      } else toast.error(d.error || "Yüklenemedi");
    } catch {
      toast.error("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCategoryOrder = async (cats: CategoryRow[]) => {
    setData((prev) => prev ? { ...prev, categories: cats } : prev);
    const r = await fetch("/api/admin/homepage/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: cats.map((c) => c.id) }),
    });
    const d = await r.json();
    if (d.success) toast.success("Sıralama kaydedildi");
    else toast.error(d.error || "Kaydedilemedi");
  };

  const moveCategory = (id: string, dir: -1 | 1) => {
    if (!data) return;
    const idx = data.categories.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (next < 0 || next >= data.categories.length) return;
    const cats = [...data.categories];
    [cats[idx], cats[next]] = [cats[next], cats[idx]];
    saveCategoryOrder(cats);
  };

  const onCatDrop = (targetId: string) => {
    if (!data || !dragCatId || dragCatId === targetId) return;
    const from = data.categories.findIndex((c) => c.id === dragCatId);
    const to = data.categories.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;
    const cats = [...data.categories];
    const [moved] = cats.splice(from, 1);
    cats.splice(to, 0, moved);
    setDragCatId(null);
    saveCategoryOrder(cats);
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const r = await fetch("/api/admin/homepage/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryName: newCat.trim() }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Eklendi"); setNewCat(""); load(); }
    else toast.error(d.error || "Eklenemedi");
  };

  const toggleCategory = async (cat: CategoryRow) => {
    await fetch("/api/admin/homepage/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, active: !cat.active }),
    });
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Kategori satırı ana sayfadan kaldırılsın mı?")) return;
    await fetch("/api/admin/homepage/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Silindi");
    load();
  };

  const updateSlot = async (key: string, patch: Partial<HomeBannerSlotDTO>) => {
    const r = await fetch("/api/admin/homepage/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...patch }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Konum ayarı kaydedildi"); load(); }
    else toast.error(d.error || "Kaydedilemedi");
  };

  const createSlot = async () => {
    if (!newSlot.label.trim()) {
      toast.error("Etiket zorunlu");
      return;
    }
    const r = await fetch("/api/admin/homepage/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSlot),
    });
    const d = await r.json();
    if (d.success) {
      toast.success("Banner konumu oluşturuldu");
      setShowNewSlot(false);
      setNewSlot({ key: "", label: "", placement: "after_hero", displayMode: "carousel", gridColumns: 2 });
      setSelectedSlot(d.data.key);
      load();
    } else toast.error(d.error || "Oluşturulamadı");
  };

  const deleteSlot = async (key: string) => {
    if (!confirm("Bu banner konumu ve tüm bannerları silinsin mi?")) return;
    const r = await fetch("/api/admin/homepage/slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Silindi"); load(); }
    else toast.error(d.error || "Silinemedi");
  };

  const saveBanner = async () => {
    if (!bannerForm.imageDesktop) {
      toast.error("Masaüstü görseli zorunlu");
      return;
    }
    const payload = {
      ...bannerForm,
      slotKey: selectedSlot,
      startsAt: bannerForm.startsAt || null,
      endsAt: bannerForm.endsAt || null,
    };
    const r = await fetch("/api/admin/homepage/banners", {
      method: editingBanner ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingBanner ? { id: editingBanner, ...payload } : payload),
    });
    const d = await r.json();
    if (d.success) {
      toast.success(editingBanner ? "Güncellendi" : "Banner eklendi");
      setBannerForm(EMPTY_BANNER_FORM);
      setEditingBanner(null);
      load();
    } else toast.error(d.error || "Kaydedilemedi");
  };

  const editBanner = (b: HomeBannerDTO) => {
    setEditingBanner(b.id);
    setBannerForm({
      title: b.title,
      imageDesktop: b.imageDesktop,
      imageTablet: b.imageTablet,
      imageMobile: b.imageMobile,
      linkUrl: b.linkUrl,
      linkTarget: b.linkTarget,
      startsAt: toDatetimeLocal(b.startsAt),
      endsAt: toDatetimeLocal(b.endsAt),
    });
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Banner silinsin mi?")) return;
    await fetch("/api/admin/homepage/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Silindi");
    load();
  };

  const toggleBanner = async (b: HomeBannerDTO) => {
    await fetch("/api/admin/homepage/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, active: !b.active }),
    });
    load();
  };

  const saveBannerOrder = async (banners: HomeBannerDTO[]) => {
    if (!currentSlot) return;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) =>
          s.key === currentSlot.key ? { ...s, banners } : s,
        ),
      };
    });
    const r = await fetch("/api/admin/homepage/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotKey: currentSlot.key, ids: banners.map((b) => b.id) }),
    });
    const d = await r.json();
    if (d.success) toast.success("Banner sırası kaydedildi");
    else toast.error(d.error || "Sıralama kaydedilemedi");
  };

  const onBannerDrop = (targetId: string) => {
    if (!currentSlot || !dragBannerId || dragBannerId === targetId) return;
    const from = currentSlot.banners.findIndex((b) => b.id === dragBannerId);
    const to = currentSlot.banners.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...currentSlot.banners];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragBannerId(null);
    saveBannerOrder(next);
  };

  const saveHero = async () => {
    setSavingHero(true);
    try {
      const r = await fetch("/api/admin/homepage/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroForm),
      });
      const d = await r.json();
      if (d.success) toast.success("Hero kaydedildi");
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSavingHero(false);
    }
  };

  const currentSlot = data?.slots.find((s) => s.key === selectedSlot);
  const placementLabel = (p: string) => PAGE_PLACEMENTS.find((x) => x.value === p)?.label || p;

  if (loading) return <div className="text-center py-16 text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ana Sayfa Yönetimi</h1>
          <p className="text-sm text-gray-500">Hero video, kategori satırları, çoklu banner konumları ve zamanlama</p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="ml-auto text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <Layout size={14} /> Ana sayfayı gör
        </Link>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {([
          ["categories", "Kategori Satırları"],
          ["banners", "Bannerlar"],
          ["heroBuilder", "Hero Yönetimi"],
          ["hero", "Hero Video"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "categories" && data && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-3">
              Ana sayfada gösterilecek kategori satırlarını sürükleyerek sıralayın, ekleyin veya kaldırın.
            </p>
            <div className="flex gap-2 flex-wrap">
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="">Kategori seç...</option>
                {data.availableCategories
                  .filter((c) => !data.categories.some((x) => x.categoryName === c))
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={addCategory}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1"
              >
                <Plus size={14} /> Ekle
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[min(70vh,calc(100dvh-16rem))] overflow-y-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-10" />
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Başlık</th>
                  <th className="p-3">Max ürün</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3 w-32" />
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat) => (
                  <tr
                    key={cat.id}
                    draggable
                    onDragStart={() => setDragCatId(cat.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onCatDrop(cat.id)}
                    className={`border-t hover:bg-gray-50/80 ${dragCatId === cat.id ? "opacity-50" : ""}`}
                  >
                    <td className="p-3 text-gray-400 cursor-grab"><GripVertical size={16} /></td>
                    <td className="p-3 font-medium">{cat.categoryName}</td>
                    <td className="p-3">
                      <input
                        defaultValue={cat.title}
                        onBlur={async (e) => {
                          if (e.target.value === cat.title) return;
                          await fetch("/api/admin/homepage/categories", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: cat.id, title: e.target.value }),
                          });
                        }}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        defaultValue={cat.maxProducts}
                        min={4}
                        max={24}
                        onBlur={async (e) => {
                          const v = parseInt(e.target.value, 10);
                          if (v === cat.maxProducts) return;
                          await fetch("/api/admin/homepage/categories", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: cat.id, maxProducts: v }),
                          });
                        }}
                        className="w-16 rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cat.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {cat.active ? "Aktif" : "Gizli"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveCategory(cat.id, -1)} className="p-1 hover:bg-gray-100 rounded"><ChevronUp size={14} /></button>
                        <button type="button" onClick={() => moveCategory(cat.id, 1)} className="p-1 hover:bg-gray-100 rounded"><ChevronDown size={14} /></button>
                        <button type="button" onClick={() => toggleCategory(cat)} className="p-1 hover:bg-gray-100 rounded">{cat.active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                        <button type="button" onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {tab === "banners" && data && (
        <div className="grid lg:grid-cols-5 gap-6 min-h-0">
          <div className="lg:col-span-2 space-y-3 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-600">Banner konumu — aynı sayfa bölgesine birden fazla konum ekleyebilirsiniz.</p>
              <button
                type="button"
                onClick={() => setShowNewSlot((v) => !v)}
                className="shrink-0 px-2 py-1 text-xs border rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus size={12} /> Yeni konum
              </button>
            </div>

            {showNewSlot && (
              <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <h4 className="font-medium text-sm">Özel banner konumu</h4>
                <input
                  placeholder="Etiket (ör. Yaz Kampanyası)"
                  value={newSlot.label}
                  onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  placeholder="Anahtar (opsiyonel, boş = otomatik)"
                  value={newSlot.key}
                  onChange={(e) => setNewSlot((s) => ({ ...s, key: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <select
                  value={newSlot.placement}
                  onChange={(e) => setNewSlot((s) => ({ ...s, placement: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {PAGE_PLACEMENTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={newSlot.displayMode}
                  onChange={(e) => setNewSlot((s) => ({ ...s, displayMode: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {BANNER_DISPLAY_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <button type="button" onClick={createSlot} className="w-full py-2 text-sm bg-gray-900 text-white rounded-lg">
                  Oluştur
                </button>
              </div>
            )}

            {data.slots.map((slot) => (
              <button
                key={slot.key}
                type="button"
                onClick={() => { setSelectedSlot(slot.key); setEditingBanner(null); setBannerForm(EMPTY_BANNER_FORM); }}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selectedSlot === slot.key ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{slot.label}</span>
                  <span className="text-xs text-gray-400">{slot.banners.length} banner</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{placementLabel(slot.placement)} · {slot.displayMode}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4 min-w-0">
            <MediaSpecGuide variant="banner" />

            {currentSlot && (
              <>
                <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                  <h3 className="font-semibold text-gray-900">{currentSlot.label} — Ayarlar</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Sayfa konumu</label>
                      <select
                        value={currentSlot.placement}
                        onChange={(e) => updateSlot(currentSlot.key, { placement: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {PAGE_PLACEMENTS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Görünüm</label>
                      <select
                        value={currentSlot.displayMode}
                        onChange={(e) => updateSlot(currentSlot.key, { displayMode: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {BANNER_DISPLAY_MODES.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    {currentSlot.displayMode === "grid" && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Izgara sütun</label>
                        <select
                          value={currentSlot.gridColumns}
                          onChange={(e) => updateSlot(currentSlot.key, { gridColumns: parseInt(e.target.value, 10) })}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        >
                          <option value={2}>2 sütun</option>
                          <option value={3}>3 sütun</option>
                        </select>
                      </div>
                    )}
                    {(currentSlot.displayMode === "carousel" || currentSlot.displayMode === "strip") && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Geçiş süresi (ms)</label>
                        <input
                          type="number"
                          defaultValue={currentSlot.intervalMs}
                          min={2000}
                          step={500}
                          onBlur={(e) => updateSlot(currentSlot.key, { intervalMs: parseInt(e.target.value, 10) || 5000 })}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(currentSlot.displayMode === "carousel") && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentSlot.autoplay}
                          onChange={(e) => updateSlot(currentSlot.key, { autoplay: e.target.checked })}
                        />
                        Otomatik geçiş
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={currentSlot.active}
                        onChange={(e) => updateSlot(currentSlot.key, { active: e.target.checked })}
                      />
                      Konum aktif
                    </label>
                    {!["after_hero", "after_features", "after_search", "before_ecosystem", "before_partners"].includes(currentSlot.key) && (
                      <button
                        type="button"
                        onClick={() => deleteSlot(currentSlot.key)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Konumu sil
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ImageIcon size={16} />
                    {editingBanner ? "Banner Düzenle" : "Yeni Banner Ekle"}
                  </h3>
                  <p className="text-xs text-gray-500">Bu konuma istediğiniz kadar banner ekleyin; görünüm modu tekli / carousel / grid / şerit olarak ayarlanır.</p>
                  <input
                    placeholder="Başlık (opsiyonel, erişilebilirlik)"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <MediaUploadField
                    label="Masaüstü görsel *"
                    value={bannerForm.imageDesktop}
                    onChange={(v) => setBannerForm((f) => ({ ...f, imageDesktop: v }))}
                    maxBytes={(MEDIA_SPECS.banner.desktop.maxKb ?? 400) * 1024}
                  />
                  <MediaUploadField
                    label="Tablet görsel (boş = masaüstü)"
                    value={bannerForm.imageTablet}
                    onChange={(v) => setBannerForm((f) => ({ ...f, imageTablet: v }))}
                    maxBytes={(MEDIA_SPECS.banner.tablet.maxKb ?? 280) * 1024}
                  />
                  <MediaUploadField
                    label="Mobil görsel (boş = masaüstü)"
                    value={bannerForm.imageMobile}
                    onChange={(v) => setBannerForm((f) => ({ ...f, imageMobile: v }))}
                    maxBytes={(MEDIA_SPECS.banner.mobile.maxKb ?? 200) * 1024}
                  />
                  <input
                    placeholder="Link URL (opsiyonel)"
                    value={bannerForm.linkUrl}
                    onChange={(e) => setBannerForm((f) => ({ ...f, linkUrl: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <select
                    value={bannerForm.linkTarget}
                    onChange={(e) => setBannerForm((f) => ({ ...f, linkTarget: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="_self">Aynı sekme</option>
                    <option value="_blank">Yeni sekme</option>
                  </select>
                  <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <Calendar size={12} /> Yayın başlangıcı
                      </label>
                      <input
                        type="datetime-local"
                        value={bannerForm.startsAt}
                        onChange={(e) => setBannerForm((f) => ({ ...f, startsAt: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <Clock size={12} /> Yayın bitişi
                      </label>
                      <input
                        type="datetime-local"
                        value={bannerForm.endsAt}
                        onChange={(e) => setBannerForm((f) => ({ ...f, endsAt: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Boş bırakırsanız banner süresiz yayında kalır.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveBanner} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1">
                      <Save size={14} /> {editingBanner ? "Güncelle" : "Ekle"}
                    </button>
                    {editingBanner && (
                      <button
                        type="button"
                        onClick={() => { setEditingBanner(null); setBannerForm(EMPTY_BANNER_FORM); }}
                        className="px-4 py-2 text-sm border rounded-lg"
                      >
                        İptal
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-white shadow-sm divide-y">
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center gap-1">
                    <GripVertical size={12} /> Sürükleyerek sıralayın
                  </div>
                  {currentSlot.banners.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400 text-center">Bu konumda henüz banner yok</p>
                  ) : (
                    currentSlot.banners.map((b) => {
                      const schedule = formatSchedule(b);
                      const live = isScheduledLive(b);
                      return (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={() => setDragBannerId(b.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onBannerDrop(b.id)}
                          className={`p-4 flex gap-4 items-center ${dragBannerId === b.id ? "opacity-50 bg-gray-50" : ""}`}
                        >
                          <span className="text-gray-300 cursor-grab shrink-0"><GripVertical size={16} /></span>
                          <div className="w-24 h-14 rounded overflow-hidden bg-gray-100 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.imageMobile || b.imageDesktop} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{b.title || "Banner"}</p>
                            {b.campaignId && (
                              <Link
                                href={toAdminUrl("/admin/campaigns")}
                                className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 mt-0.5"
                              >
                                <Tag size={10} /> Kampanya: {b.campaignName || "Bağlı"}
                              </Link>
                            )}
                            <p className="text-xs text-gray-400 truncate">{b.linkUrl || "Link yok"}</p>
                            {schedule && (
                              <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                                <Clock size={10} /> {schedule}
                                {live === "upcoming" && <span className="text-blue-600">(yakında)</span>}
                                {live === "expired" && <span className="text-red-600">(süresi doldu)</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => editBanner(b)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Düzenle</button>
                            <button type="button" onClick={() => toggleBanner(b)} className="p-1 hover:bg-gray-100 rounded">{b.active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            <button type="button" onClick={() => deleteBanner(b.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "heroBuilder" && <HeroBuilderPanel />}

      {tab === "hero" && (
        <div className="max-w-2xl space-y-4">
          <MediaSpecGuide variant="hero" />

          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Video size={16} /> Hero video & poster
            </h3>
            <MediaUploadField
              label="Masaüstü video (MP4)"
              value={heroForm.heroVideoDesktop}
              onChange={(v) => setHeroForm((h) => ({ ...h, heroVideoDesktop: v }))}
              accept="video/mp4,video/webm"
              kind="hero"
              maxBytes={(MEDIA_SPECS.hero.videoDesktop.maxMb ?? 15) * 1024 * 1024}
            />
            <MediaUploadField
              label="Mobil video (MP4, düşük çözünürlük önerilir)"
              value={heroForm.heroVideoMobile}
              onChange={(v) => setHeroForm((h) => ({ ...h, heroVideoMobile: v }))}
              accept="video/mp4,video/webm"
              kind="hero"
              maxBytes={(MEDIA_SPECS.hero.videoMobile.maxMb ?? 8) * 1024 * 1024}
            />
            <MediaUploadField
              label="Poster görsel (video yüklenene kadar)"
              value={heroForm.heroPoster}
              onChange={(v) => setHeroForm((h) => ({ ...h, heroPoster: v }))}
              kind="hero"
              maxBytes={(MEDIA_SPECS.hero.poster.maxKb ?? 250) * 1024}
            />
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Metin & CTA</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={heroForm.useCustomHeroText}
                onChange={(e) => setHeroForm((h) => ({ ...h, useCustomHeroText: e.target.checked }))}
              />
              Özel metin kullan (kapalıyken çeviri metinleri gösterilir)
            </label>
            {heroForm.useCustomHeroText && (
              <>
                <input
                  placeholder="Üst rozet metni"
                  value={heroForm.heroBadge}
                  onChange={(e) => setHeroForm((h) => ({ ...h, heroBadge: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Açıklama"
                  value={heroForm.heroDescription}
                  onChange={(e) => setHeroForm((h) => ({ ...h, heroDescription: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Birincil buton metni"
                    value={heroForm.heroCtaPrimaryLabel}
                    onChange={(e) => setHeroForm((h) => ({ ...h, heroCtaPrimaryLabel: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Birincil buton URL"
                    value={heroForm.heroCtaPrimaryUrl}
                    onChange={(e) => setHeroForm((h) => ({ ...h, heroCtaPrimaryUrl: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="İkincil buton metni"
                    value={heroForm.heroCtaSecondaryLabel}
                    onChange={(e) => setHeroForm((h) => ({ ...h, heroCtaSecondaryLabel: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="İkincil buton URL"
                    value={heroForm.heroCtaSecondaryUrl}
                    onChange={(e) => setHeroForm((h) => ({ ...h, heroCtaSecondaryUrl: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={saveHero}
              disabled={savingHero}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
              <Save size={14} /> {savingHero ? "Kaydediliyor..." : "Hero kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
