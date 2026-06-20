"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, FileText, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

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

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });

  const fetchPages = () => {
    fetch("/api/admin/pages")
      .then((r) => r.json())
      .then((d) => {
        setPages(d.data || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchPages(); }, []);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sayfalar</h1>
          <p className="text-sm text-gray-500 mt-1">Statik sayfaları yönetin (SSS, Kargo, İade, İletişim...)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
          <Plus size={15} /> Yeni Sayfa
        </button>
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
          <p className="text-xs text-gray-400">Sayfa şu URL'de yayınlanacak: /{form.slug || "..."}</p>
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
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Sıra</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Şablon</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">URL</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <ChevronUp size={14} className="text-gray-300" />
                      <span className="text-xs text-gray-400 w-4 text-center">{p.order}</span>
                      <ChevronDown size={14} className="text-gray-300" />
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
                    <a href={`/${p.slug}`} target="_blank" className="text-xs text-blue-600 hover:underline font-mono">
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
                      <Link href={`/admin/pages/${p.id}`}
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
