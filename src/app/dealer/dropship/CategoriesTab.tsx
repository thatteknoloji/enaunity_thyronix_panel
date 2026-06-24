"use client";

import { useEffect, useState } from "react";
import {
  Package, Plus, Trash2, Save, GripVertical,
  AlertCircle, CheckCircle, Loader2, Search, X, Download
} from "lucide-react";

export type StoreCategory = {
  id: string;
  name: string;
  catalogCategory: string | null;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type CatalogCategoryOption = {
  name: string;
  productCount: number;
};

interface CategoriesTabProps {
  storeId: string;
}

export default function CategoriesTab({ storeId }: CategoriesTabProps) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [catalogCategories, setCatalogCategories] = useState<CatalogCategoryOption[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [bulkImporting, setBulkImporting] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ category: string; count: number } | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/dealer/dropship/categories");
      const d = await res.json();
      if (d.success) setCategories(d.data);
    } catch {
      setError("Kategoriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogCategories = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`/api/dealer/dropship/catalog-categories?search=${encodeURIComponent(catalogSearch)}`);
      const d = await res.json();
      if (d.success) setCatalogCategories(d.data);
    } catch {
      // silent
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (catalogSearch.length >= 1) {
      const t = setTimeout(() => fetchCatalogCategories(), 300);
      return () => clearTimeout(t);
    } else {
      setCatalogCategories([]);
    }
  }, [catalogSearch]);

  const addFromCatalog = async (categoryName: string) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/dealer/dropship/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, catalogCategory: categoryName }),
      });
      const d = await res.json();
      if (d.success) {
        setCategories((prev) => [...prev, d.data]);
        setSuccess(`"${categoryName}" eklendi`);
      } else {
        setError(d.error || "Eklenemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const bulkImportCategory = async (catalogCategory: string) => {
    setBulkImporting(catalogCategory);
    setError(""); setBulkResult(null);
    try {
      const res = await fetch("/api/dealer/dropship/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogCategory }),
      });
      const d = await res.json();
      if (d.success) {
        setBulkResult({ category: catalogCategory, count: d.data.addedCount });
        fetchCategories();
      } else {
        setError(d.error || "Hata");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setBulkImporting(null);
    }
  };

  const startEdit = (cat: StoreCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveName = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dealer/dropship/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editName.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, name: editName.trim() } : c));
        setSuccess("Kategori adı güncellendi");
      } else {
        setError(d.error || "Güncellenemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const toggleActive = async (cat: StoreCategory) => {
    try {
      const res = await fetch("/api/dealer/dropship/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: !cat.isActive }),
      });
      const d = await res.json();
      if (d.success) {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, isActive: !cat.isActive } : c));
      }
    } catch {
      setError("Güncellenemedi");
    }
  };

  const removeCategory = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/dealer/dropship/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setSuccess("Kategori kaldırıldı");
      } else {
        setError(d.error || "Silinemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...categories];
    const a = next[index];
    const b = next[index - 1];
    const tmpOrder = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmpOrder;
    next[index] = b;
    next[index - 1] = a;
    setCategories(next);
    fetch("/api/dealer/dropship/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, sortOrder: a.sortOrder }),
    });
    fetch("/api/dealer/dropship/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, sortOrder: b.sortOrder }),
    });
  };

  const moveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    const next = [...categories];
    const a = next[index];
    const b = next[index + 1];
    const tmpOrder = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmpOrder;
    next[index] = b;
    next[index + 1] = a;
    setCategories(next);
    fetch("/api/dealer/dropship/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, sortOrder: a.sortOrder }),
    });
    fetch("/api/dealer/dropship/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, sortOrder: b.sortOrder }),
    });
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto text-gray-500" />
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Kategoriler</h2>
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
        {bulkResult && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{bulkResult.count} ürün "{bulkResult.category}" kategorisinden mağazaya eklendi.</span>
            <button onClick={() => setBulkResult(null)} className="ml-auto p-0.5 hover:bg-blue-500/20 rounded">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Search size={16} className="text-ena-light" />
          <input type="text" value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Ürün Deposu kategorilerinde ara ve ekle..."
            className="flex-1 px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
          {catalogSearch && (
            <button onClick={() => setCatalogSearch("")} className="p-1.5 hover:bg-white/10 rounded-lg text-ena-light">
              <X size={16} />
            </button>
          )}
        </div>

        {catalogSearch && (
          <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-white/5 rounded-xl border border-white/10">
            {loadingCatalog ? (
              <p className="text-sm text-ena-light text-center py-4">Aranıyor...</p>
            ) : catalogCategories.length > 0 ? (
              catalogCategories.map((cc) => {
                const alreadyAdded = categories.some((c) => c.catalogCategory === cc.name);
                return (
                  <div key={cc.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div>
                      <p className="text-sm text-white">{cc.name}</p>
                      <p className="text-xs text-ena-light">{cc.productCount} ürün</p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-ena-light px-2 py-1">Eklendi</span>
                    ) : (
                      <button onClick={() => addFromCatalog(cc.name)} disabled={saving}
                        className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-50">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-ena-light text-center py-4">Eşleşen kategori bulunamadı</p>
            )}
          </div>
        )}

        {sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((cat, index) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(index)} className="p-0.5 hover:bg-white/10 rounded text-ena-light hover:text-white transition-colors">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 5L5 1L9 5"/></svg>
                    </button>
                    <button onClick={() => moveDown(index)} className="p-0.5 hover:bg-white/10 rounded text-ena-light hover:text-white transition-colors">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1L5 5L9 1"/></svg>
                    </button>
                  </div>
                  <Package size={16} className={`${cat.isActive ? "text-orange-400" : "text-gray-500"}`} />
                  <div>
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingId(null); }}
                          className="px-2 py-1 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-48"
                          autoFocus />
                        <button onClick={saveName} className="p-1 text-green-400 hover:bg-green-500/20 rounded"><Save size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-ena-light hover:bg-white/10 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(cat)} className="text-sm font-medium text-white hover:text-orange-400 transition-colors text-left">
                        {cat.name}
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ena-light">{cat.productCount} ürün</span>
                      {cat.catalogCategory && (
                        <span className="text-xs text-ena-light">— Kaynak: {cat.catalogCategory}</span>
                      )}
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-1.5">
                    {cat.catalogCategory && (
                      <button onClick={() => bulkImportCategory(cat.catalogCategory!)} disabled={bulkImporting === cat.catalogCategory}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 flex items-center gap-1">
                        {bulkImporting === cat.catalogCategory ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {bulkImporting === cat.catalogCategory ? "..." : "Hepsini Ekle"}
                      </button>
                    )}
                    <button onClick={() => toggleActive(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        cat.isActive
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                      }`}>
                      {cat.isActive ? "Aktif" : "Pasif"}
                    </button>
                    <button onClick={() => removeCategory(cat.id)} disabled={saving}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-ena-light">Henüz kategori eklemedin. Yukarıdaki arama kutusundan Ürün Deposu kategorilerini ara ve ekle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
