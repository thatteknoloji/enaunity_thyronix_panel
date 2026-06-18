"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, ArrowLeft, FolderTree, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Category { id: string; name: string; slug: string; parentId: string | null; image: string; active: boolean; sortOrder: number; }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "", image: "" });
  const [saving, setSaving] = useState(false);

  const fetchCats = () => {
    fetch("/api/admin/categories").then(r => r.json()).then(d => setCategories(d.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => { fetchCats(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Kategori adı gerekli");
    setSaving(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, name: form.name, parentId: form.parentId || null, image: form.image, active: true } : { name: form.name, slug, parentId: form.parentId || null, image: form.image };
    const res = await fetch("/api/admin/categories", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast.success(editingId ? "Güncellendi" : "Eklendi"); fetchCats(); resetForm(); }
    else { const e = await res.json(); toast.error(e.error || "Hata"); }
    setSaving(false);
  };

  const resetForm = () => { setForm({ name: "", parentId: "", image: "" }); setEditingId(null); setShowForm(false); };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kategori ve alt kategorileri silinsin mi?")) return;
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchCats(); toast.success("Silindi");
  };

  // Get descendants of a category (recursive)
  const getDescendants = (parentId: string, list: Category[]): Set<string> => {
    const ids = new Set<string>();
    const children = list.filter(c => c.parentId === parentId);
    children.forEach(c => { ids.add(c.id); getDescendants(c.id, list).forEach(id => ids.add(id)); });
    return ids;
  };

  // Available parents filtered for editing
  const availableParents = useMemo(() => {
    if (!editingId) return categories;
    const exclude = new Set([editingId, ...getDescendants(editingId, categories)]);
    return categories.filter(c => !exclude.has(c.id));
  }, [categories, editingId]);

  // Build a flat list with depth indicators for tree display
  const buildHierarchy = (parentId: string | null, depth: number): Array<{ cat: Category; depth: number }> => {
    const children = categories.filter(c => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    let result: Array<{ cat: Category; depth: number }> = [];
    children.forEach(c => {
      result.push({ cat: c, depth });
      result = result.concat(buildHierarchy(c.id, depth + 1));
    });
    return result;
  };

  // Get parent labels for display
  const getParentPath = (cat: Category): string => {
    const parts: string[] = [];
    let current: Category | undefined = cat;
    while (current?.parentId) {
      current = categories.find(c => c.id === current!.parentId);
      if (current) parts.unshift(current.name);
    }
    return parts.length > 0 ? parts.join(" > ") + " > " : "";
  };

  const hierarchy = buildHierarchy(null, 0);
  const parentOptions = buildHierarchy(null, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Kategoriler</h1><p className="mt-1 text-sm text-gray-500">Sınırsız derinlikte kategori ağacı</p></div>
        <div className="ml-auto"><Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} className="mr-1" /> Yeni Kategori</Button></div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? "Kategoriyi Düzenle" : "Yeni Kategori"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori Adı</label>
              <Input id="cn" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kategori adı" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Üst Kategori</label>
              <select className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                <option value="">— Ana Kategori (üst yok) —</option>
                {parentOptions.map(({ cat, depth }) => (
                  <option key={cat.id} value={cat.id} disabled={editingId ? cat.id === editingId : false}>
                    {"\u00A0\u00A0".repeat(depth)}{depth > 0 ? "↳ " : ""}{cat.name}
                  </option>
                ))}
              </select>
              {editingId && <p className="text-[10px] text-gray-400 mt-1">Kendi alt kategorisi seçilemez</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Görsel URL</label>
              <Input id="ci" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}</Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> : hierarchy.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><FolderTree size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz kategori yok</p></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {hierarchy.map(({ cat, depth }, i) => (
            <div key={cat.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50/50 transition-colors`}>
              <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: `${depth * 24}px` }}>
                {depth > 0 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
                <FolderTree size={16} className={depth === 0 ? "text-gray-500" : "text-gray-300"} />
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{cat.slug}</span>
                  {cat.parentId && <span className="text-[10px] text-gray-300 ml-1">({getParentPath(cat)})</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => { setForm({ name: cat.name, parentId: cat.parentId || "", image: cat.image }); setEditingId(cat.id); setShowForm(true); }}>Düzenle</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)} className="text-ena-primary"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
