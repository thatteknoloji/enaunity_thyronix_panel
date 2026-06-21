"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { toAdminUrl } from "@/lib/auth/admin-access";
import type { FooterLegalStripItemDTO } from "@/lib/footer-legal-strip";

type FormItem = FooterLegalStripItemDTO;

export default function FooterLegalStripAdminPage() {
  const ic =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none bg-white text-gray-900";
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/footer-legal-strip");
      const d = await r.json();
      if (d.success) setItems(d.data || []);
      else toast.error(d.error || "Yüklenemedi");
    } catch {
      toast.error("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async () => {
    const r = await fetch("/api/admin/footer-legal-strip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Yeni rozet", active: true }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success("Eklendi");
      load();
    } else toast.error(d.error || "Eklenemedi");
  };

  const saveItem = async (item: FormItem) => {
    setSavingId(item.id);
    try {
      const r = await fetch(`/api/admin/footer-legal-strip/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const d = await r.json();
      if (d.success) toast.success("Kaydedildi");
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    }
    setSavingId(null);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Bu öğe silinsin mi?")) return;
    const r = await fetch(`/api/admin/footer-legal-strip/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      toast.success("Silindi");
      load();
    } else toast.error(d.error || "Silinemedi");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await fetch("/api/admin/footer-legal-strip", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
  };

  const patch = (id: string, patch: Partial<FormItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="max-w-4xl">
      <Link
        href={toAdminUrl("/admin/footer-settings")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={14} /> Footer Ayarları
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Footer Hukuki Şerit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Footer altında görünen ödeme / güvenlik rozetleri (ss2 tarzı). Görsel URL veya metin
            kullanın.
          </p>
        </div>
        <Button type="button" onClick={addItem} className="gap-1.5">
          <Plus size={15} /> Yeni Ekle
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Henüz öğe yok. Visa, Mastercard, SSL vb. ekleyin.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-xs text-gray-400 ml-2">Sıra {index + 1}</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) => patch(item.id, { active: e.target.checked })}
                  />
                  Yayında
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Metin / Alt yazı
                  </label>
                  <input
                    className={ic}
                    value={item.label}
                    onChange={(e) => patch(item.id, { label: e.target.value })}
                    placeholder="256 Bit SSL & 3D Secure"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Görsel URL (opsiyonel)
                  </label>
                  <input
                    className={ic}
                    value={item.imageUrl}
                    onChange={(e) => patch(item.id, { imageUrl: e.target.value })}
                    placeholder="/uploads/footer/visa.png"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Link URL (opsiyonel)
                  </label>
                  <input
                    className={ic}
                    value={item.linkUrl}
                    onChange={(e) => patch(item.id, { linkUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {(item.imageUrl || item.label) && (
                <div className="rounded-lg border border-gray-100 bg-[#f3f4f6] p-3 flex justify-center">
                  <div className="inline-flex min-h-[40px] items-center justify-center rounded border border-gray-200 bg-white px-4 py-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.label}
                        className="max-h-8 max-w-[120px] object-contain"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveItem(item)}
                  disabled={savingId === item.id}
                >
                  <Save size={14} className="mr-1" />
                  {savingId === item.id ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => deleteItem(item.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 size={14} className="mr-1" /> Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
