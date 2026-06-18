"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, ArrowLeft, Package, PackagePlus, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", image: "", items: [] as Array<{ productId: string; quantity: number }> });
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");

  useEffect(() => {
    fetch("/api/admin/bundles").then(r => r.json()).then(d => setBundles(d.data || [])).finally(() => setLoading(false));
    fetch("/api/products?all=true").then(r => r.json()).then(d => setProducts(d.data || []));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || form.items.length < 2) return toast.error("En az 2 ürün ekleyin ve isim verin");
    setSaving(true);
    const body = { ...form, price: parseFloat(form.price) || 0 };
    const method = editingId ? "PATCH" : "POST";
    const url = "/api/admin/bundles";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...body } : body) });
    if (res.ok) { toast.success(editingId ? "Güncellendi" : "Oluşturuldu"); fetchBundles(); resetForm(); }
    else toast.error("Hata");
    setSaving(false);
  };

  const fetchBundles = () => { fetch("/api/admin/bundles").then(r => r.json()).then(d => setBundles(d.data || [])); };

  const resetForm = () => { setForm({ name: "", description: "", price: "", image: "", items: [] }); setEditingId(null); setShowForm(false); setSearch(""); setSelectedCat(""); };

  const handleDelete = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await fetch("/api/admin/bundles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchBundles(); toast.success("Silindi");
  };

  const addToBundle = (product: any) => {
    if (form.items.find(i => i.productId === product.id)) return;
    setForm({ ...form, items: [...form.items, { productId: product.id, quantity: 1 }] });
  };

  const removeFromBundle = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCat && p.category !== selectedCat) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Paket / Bundle / Kombin</h1><p className="mt-1 text-sm text-gray-500">Ürün setleri oluştur — farklı kategorilerden ürünleri tek fiyata paketle</p></div>
        <div className="ml-auto"><Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} className="mr-1" /> Yeni Paket</Button></div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? "Paketi Düzenle" : "Yeni Paket / Kombin"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Bundle info */}
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Paket Adı *</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="örn: Yaz Kombini" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Açıklama</label><textarea className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Paket Fiyatı (₺) *</label><input type="number" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Görsel URL</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} /></div>

              {/* Selected items */}
              <div className="p-3 border border-dashed border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Paketteki Ürünler ({form.items.length})</p>
                {form.items.length === 0 ? (
                  <p className="text-xs text-gray-400">→ Sağdaki listeden ürün ekleyin (en az 2 farklı kategori)</p>
                ) : (
                  <div className="space-y-1.5">
                    {form.items.map((item, i) => {
                      const p = products.find(x => x.id === item.productId);
                      return (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[9px] text-gray-500">{i+1}</span>
                            <span className="truncate">{p?.name || item.productId}</span>
                            <span className="text-gray-400">{p?.category}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input type="number" min={1} value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = parseInt(e.target.value) || 1; setForm({ ...form, items }); }} className="w-14 text-center rounded border border-gray-200 px-1 py-0.5 text-xs" />
                            <button onClick={() => removeFromBundle(i)} className="text-gray-400 hover:text-ena-primary"><X size={12} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total comparison */}
              {form.items.length > 0 && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  Normal fiyat: <span className="line-through">{form.items.reduce((sum, item) => { const p = products.find(x => x.id === item.productId); return sum + (p?.price || 0) * item.quantity; }, 0).toFixed(2)} ₺</span>
                  {" → "}Paket fiyatı: <span className="text-emerald-600 font-bold">{parseFloat(form.price || "0").toFixed(2)} ₺</span>
                  {" → "}Tasarruf: <span className="text-ena-primary font-bold">{Math.max(0, form.items.reduce((sum, item) => { const p = products.find(x => x.id === item.productId); return sum + (p?.price || 0) * item.quantity; }, 0) - parseFloat(form.price || "0")).toFixed(2)} ₺</span>
                </div>
              )}
            </div>

            {/* Right: Product picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Ürün Seç</label>
              <div className="flex gap-2 mb-3">
                <input className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredProducts.map(p => {
                  const isAdded = form.items.some(i => i.productId === p.id);
                  return (
                    <button key={p.id} onClick={() => !isAdded && addToBundle(p)}
                      className={`w-full text-left flex items-center gap-2 text-xs p-2 rounded transition-colors ${isAdded ? "bg-emerald-50 text-emerald-700 cursor-default" : "hover:bg-gray-50 text-gray-700 cursor-pointer"}`}>
                      <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center text-[9px]">{p.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0"><p className="font-medium truncate text-xs">{p.name}</p><p className="text-[10px] text-gray-400">{p.category} · {p.price.toFixed(2)} ₺</p></div>
                      {isAdded ? <span className="text-[10px] text-emerald-600 font-medium">Eklendi ✓</span> : <Plus size={14} className="text-gray-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
            <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> : bundles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><PackagePlus size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz paket oluşturulmadı</p></div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map(b => (
            <div key={b.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-sm">{b.name}</h3>
                  <span className="text-emerald-600 font-bold">{b.price.toFixed(2)} ₺</span>
                </div>
                {b.description && <p className="text-xs text-gray-500 mb-3">{b.description}</p>}
                <div className="space-y-1.5 mb-3">
                  {b.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <Package size={12} className="text-gray-400" />
                      <span className="flex-1 truncate">{item.product?.name}</span>
                      <span className="text-gray-400">x{item.quantity}</span>
                      <span className="text-gray-400">{item.product?.category}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">{b.items.length} ürün</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setForm({ name: b.name, description: b.description, price: String(b.price), image: b.image || "", items: b.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) });
                      setEditingId(b.id); setShowForm(true);
                    }}>Düzenle</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)} className="text-ena-primary"><Trash2 size={14} /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
