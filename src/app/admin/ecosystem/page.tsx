"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GripVertical, Plus, RefreshCw } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ShowcaseIcon } from "@/components/ecosystem/ShowcaseIcon";
import type { ProductShowcaseDTO } from "@/lib/ecosystem/types";
import toast from "react-hot-toast";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Yayında",
  COMING_SOON: "Yakında",
  HIDDEN: "Gizli",
  ARCHIVED: "Arşiv",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  COMING_SOON: "bg-amber-50 text-amber-700",
  HIDDEN: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-red-50 text-red-700",
};

export default function EcosystemAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductShowcaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ecosystem/products?scope=admin");
      const d = await r.json();
      if (d.success) setItems(d.data || []);
      else toast.error(d.error || "Yüklenemedi");
    } catch {
      toast.error("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveOrder = async (next: ProductShowcaseDTO[]) => {
    setItems(next);
    const r = await fetch("/api/ecosystem/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
    const d = await r.json();
    if (d.success) toast.success("Sıralama kaydedildi");
    else toast.error(d.error || "Sıralama kaydedilemedi");
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((i) => i.id === dragId);
    const to = items.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    saveOrder(next);
  };

  const action = async (type: string, id: string) => {
    if (type === "delete" && !confirm("Ürün silinsin mi?")) return;
    try {
      if (type === "delete") {
        await fetch(`/api/ecosystem/products/${id}`, { method: "DELETE" });
        toast.success("Silindi");
        load();
      } else if (type === "duplicate") {
        const r = await fetch("/api/ecosystem/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "duplicate", id }),
        });
        const d = await r.json();
        if (d.success) { toast.success("Kopyalandı"); load(); }
      } else if (type === "hide") {
        await fetch(`/api/ecosystem/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "HIDDEN" }),
        });
        toast.success("Gizlendi");
        load();
      } else if (type === "publish") {
        await fetch(`/api/ecosystem/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        });
        toast.success("Yayınlandı");
        load();
      }
    } catch {
      toast.error("İşlem başarısız");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ekosistem Vitrini</h1>
            <p className="text-sm text-gray-500 mt-1">Ekosistem ürün kartları ve tanıtım sayfaları</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={toAdminUrl("/admin/ecosystem/settings")}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Bölüm Ayarları
          </Link>
          <button type="button" onClick={load} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <RefreshCw size={14} /> Yenile
          </button>
          <button
            type="button"
            onClick={() => router.push(toAdminUrl("/admin/ecosystem/new"))}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-1"
          >
            <Plus size={14} /> Yeni Ürün
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 w-10" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sıra</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ürün</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kart</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Güncelleme</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(item.id)}
                  className={`hover:bg-gray-50/80 ${dragId === item.id ? "opacity-50" : ""}`}
                >
                  <td className="px-3 py-3 text-gray-300 cursor-grab"><GripVertical size={16} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border flex items-center justify-center" style={{ color: item.accentColor, borderColor: `${item.themeColor}33` }}>
                        <ShowcaseIcon name={item.icon} size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-400">/{item.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATUS_CLASS[item.status] || ""}`}>
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{item.shortDescription || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link href={toAdminUrl(`/admin/ecosystem/${item.id}`)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Düzenle</Link>
                      <button type="button" onClick={() => action("duplicate", item.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Kopyala</button>
                      {item.status === "ACTIVE" ? (
                        <button type="button" onClick={() => action("hide", item.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Gizle</button>
                      ) : (
                        <button type="button" onClick={() => action("publish", item.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Yayınla</button>
                      )}
                      <button type="button" onClick={() => action("delete", item.id)} className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Henüz ürün yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
