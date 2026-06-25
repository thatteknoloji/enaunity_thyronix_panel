"use client";

import { useEffect, useState } from "react";
import {
  Image, Plus, Trash2, AlertCircle, CheckCircle, Loader2, GripVertical, X, Eye, EyeOff
} from "lucide-react";

type BannerItem = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
};

const defaultBanner = { imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "" };

export default function BannersTab() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultBanner);

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/dealer/dropship/banners");
      const d = await res.json();
      if (d.success) setBanners(d.data);
    } catch {
      setError("Bannerlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const addBanner = async () => {
    if (!form.imageUrl) { setError("Görsel seçilmedi"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/dealer/dropship/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setBanners((prev) => [...prev, d.data]);
        setForm(defaultBanner);
        setShowAdd(false);
        setSuccess("Banner eklendi");
      } else setError(d.error || "Hata");
    } catch { setError("Bir hata oluştu"); }
    finally { setSaving(false); }
  };

  const updateBanner = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/dealer/dropship/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      const d = await res.json();
      if (d.success) {
        setBanners((prev) => prev.map((b) => b.id === id ? { ...b, ...data } : b));
        return true;
      }
    } catch { return false; }
    return false;
  };

  const removeBanner = async (id: string) => {
    try {
      const res = await fetch("/api/dealer/dropship/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.success) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        setSuccess("Banner silindi");
      }
    } catch { setError("Silinemedi"); }
  };

  const toggleActive = async (b: BannerItem) => {
    await updateBanner(b.id, { isActive: !b.isActive });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...banners];
    const a = next[index];
    const b = next[index - 1];
    const tmpOrder = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmpOrder;
    next[index] = b;
    next[index - 1] = a;
    setBanners(next);
    updateBanner(a.id, { sortOrder: a.sortOrder });
    updateBanner(b.id, { sortOrder: b.sortOrder });
  };

  const moveDown = (index: number) => {
    if (index >= banners.length - 1) return;
    const next = [...banners];
    const a = next[index];
    const b = next[index + 1];
    const tmpOrder = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmpOrder;
    next[index] = b;
    next[index + 1] = a;
    setBanners(next);
    updateBanner(a.id, { sortOrder: a.sortOrder });
    updateBanner(b.id, { sortOrder: b.sortOrder });
  };

  const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Banner Carousel</h2>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm">
            <Plus size={16} /> Banner Ekle
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {showAdd && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-start gap-4">
              {form.imageUrl ? (
                <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-ena-dark shrink-0">
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrl: "" })}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 rounded">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-20 rounded-xl bg-ena-dark border border-dashed border-white/20 flex items-center justify-center shrink-0">
                  <Image size={20} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input type="text" value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Görsel URL'si (veya Medya'dan seç)"
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                <input type="text" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Başlık (opsiyonel)"
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                <input type="text" value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Alt başlık (opsiyonel)"
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={form.ctaText}
                    onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                    placeholder="Buton yazısı"
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                  <input type="text" value={form.ctaLink}
                    onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                    placeholder="Buton linki"
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAdd(false); setForm(defaultBanner); }}
                className="px-3 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors">
                İptal
              </button>
              <button onClick={addBanner} disabled={saving || !form.imageUrl}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Ekle
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <Image size={40} className="mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-ena-light">Henüz banner eklemedin. Carousel'de gösterilecek bannerları ekle.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((banner, index) => (
              <div key={banner.id} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button onClick={() => moveUp(index)} className="p-0.5 hover:bg-white/10 rounded text-ena-light hover:text-white">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 5L5 1L9 5"/></svg>
                  </button>
                  <button onClick={() => moveDown(index)} className="p-0.5 hover:bg-white/10 rounded text-ena-light hover:text-white">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1L5 5L9 1"/></svg>
                  </button>
                </div>

                <div className="w-36 h-24 rounded-xl overflow-hidden bg-ena-dark shrink-0">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={24} className="text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editing?.id === banner.id ? (
                    <div className="space-y-2">
                      <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                        className="w-full px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm" placeholder="Başlık" />
                      <input type="text" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                        className="w-full px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm" placeholder="Alt başlık" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={editing.ctaText} onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })}
                          className="px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm" placeholder="Buton" />
                        <input type="text" value={editing.ctaLink} onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })}
                          className="px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm" placeholder="Link" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          await updateBanner(banner.id, { title: editing.title, subtitle: editing.subtitle, ctaText: editing.ctaText, ctaLink: editing.ctaLink });
                          setEditing(null);
                          setSuccess("Güncellendi");
                        }}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors">
                          Kaydet
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white truncate">{banner.title || "(Başlıksız)"}</p>
                      {banner.subtitle && <p className="text-xs text-ena-light truncate">{banner.subtitle}</p>}
                      {(banner.ctaText || banner.ctaLink) && (
                        <p className="text-xs text-orange-400 truncate">{banner.ctaText}{banner.ctaLink ? ` → ${banner.ctaLink}` : ""}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(banner)}
                    className={`p-1.5 rounded-lg transition-colors ${banner.isActive ? "text-green-400 hover:bg-green-500/20" : "text-gray-500 hover:bg-gray-500/20"}`}>
                    {banner.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => setEditing({ ...banner })}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-ena-light transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => removeBanner(banner.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
