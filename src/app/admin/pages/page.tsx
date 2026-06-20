"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, FileText, Eye, EyeOff, ChevronUp, ChevronDown, Download, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { useT } from "@/lib/i18n/provider";

import { PAGE_TEMPLATE_LABELS, type PageTemplate } from "@/lib/pages/types";

interface PageItem {
  id: string;
  title: string;
  slug: string;
  template?: PageTemplate;
  active: boolean;
  order: number;
  createdAt: string;
}

function sortPages(list: PageItem[]) {
  return [...list].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "tr"));
}

export default function AdminPagesPage() {
  const { t } = useT();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });

  const sortedPages = useMemo(() => sortPages(pages), [pages]);

  const fetchPages = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/pages")
      .then((r) => r.json())
      .then((d) => {
        setPages(sortPages(d.data || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const saveOrder = async (next: PageItem[]) => {
    const ordered = next.map((p, index) => ({ ...p, order: index }));
    setPages(ordered);
    setSavingOrder(true);
    try {
      const res = await fetch("/api/admin/pages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      });
      const data = await res.json();
      if (res.ok && data.success) toast.success("Sıralama kaydedildi");
      else {
        toast.error(data.error || "Sıralama kaydedilemedi");
        fetchPages();
      }
    } catch {
      toast.error("Bağlantı hatası");
      fetchPages();
    } finally {
      setSavingOrder(false);
    }
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = sortedPages.findIndex((p) => p.id === dragId);
    const to = sortedPages.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sortedPages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    saveOrder(next);
  };

  const movePage = (id: string, direction: "up" | "down") => {
    const idx = sortedPages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sortedPages.length) return;
    const next = [...sortedPages];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    saveOrder(next);
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-site-content", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${data.data.pages} sayfa yüklendi`);
        fetchPages();
      } else {
        toast.error(data.error || "Varsayılan sayfalar yüklenemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: pages.length }),
    });
    if (res.ok) {
      toast.success("Sayfa oluşturuldu");
      setShowForm(false);
      setForm({ title: "", slug: "" });
      fetchPages();
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata");
    }
  };

  const toggleActive = async (page: PageItem) => {
    const res = await fetch(`/api/admin/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...page, active: !page.active }),
    });
    if (res.ok) { toast.success(page.active ? "Yayından kaldırıldı" : "Yayınlandı"); fetchPages(); }
    else toast.error("Hata");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sayfayı silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Silindi"); fetchPages(); }
    else toast.error("Hata");
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sayfalar</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            SSS, İletişim, Kargo ve İade gibi statik sayfaları düzenleyin. Footer&apos;daki link sırası buradaki sıralamayı takip eder.
            İletişim kartları{" "}
            <Link href={toAdminUrl("/admin/footer-settings")} className="text-blue-600 hover:underline">Footer Ayarları</Link>
            ndan gelir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {pages.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download size={15} /> {seeding ? "Yükleniyor..." : "Varsayılan Sayfaları Yükle"}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
            <Plus size={15} /> Yeni Sayfa
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Başlık</label>
              <input required value={form.title}
                onChange={(e) => setForm({ title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Slug (URL)</label>
              <input required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Sayfa şu URL&apos;de yayınlanacak: /{form.slug || "..."}</p>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Oluştur</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <FileText size={40} className="mx-auto text-gray-300 animate-pulse" />
          <p className="mt-3 text-gray-500">Yükleniyor...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <FileText size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz sayfa eklenmemiş</p>
          <p className="mt-1 text-xs text-gray-400 mb-4">İletişim, SSS, Kargo ve İade sayfalarını tek tıkla yükleyebilirsiniz.</p>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Download size={15} /> {seeding ? "Yükleniyor..." : "Varsayılan Sayfaları Yükle"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm table-scroll">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <GripVertical size={14} className="text-gray-400" />
              {t("admin.drag_to_reorder")}
            </span>
            {savingOrder ? <span className="text-gray-400">Kaydediliyor…</span> : null}
          </div>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-3 py-3 w-10" />
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Sıra</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Şablon</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">URL</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPages.map((p, idx) => (
                <tr
                  key={p.id}
                  draggable={!savingOrder}
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(p.id)}
                  className={`hover:bg-gray-50/50 transition-colors ${dragId === p.id ? "opacity-50 bg-gray-50" : ""}`}
                >
                  <td className="px-3 py-3 text-gray-300 cursor-grab active:cursor-grabbing">
                    <GripVertical size={16} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0 || savingOrder}
                        onClick={() => movePage(p.id, "up")}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Yukarı taşı"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <span className="text-xs text-gray-500 w-5 text-center tabular-nums">{idx + 1}</span>
                      <button
                        type="button"
                        disabled={idx === sortedPages.length - 1 || savingOrder}
                        onClick={() => movePage(p.id, "down")}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Aşağı taşı"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.title}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {PAGE_TEMPLATE_LABELS[p.template || "default"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-mono">
                      /{p.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}>
                      {p.active ? <Eye size={11} /> : <EyeOff size={11} />}
                      {p.active ? "Yayında" : "Taslak"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={toAdminUrl(`/admin/pages/${p.id}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <Edit size={14} />
                      </Link>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-ena-primary hover:bg-ena-primary/5 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
