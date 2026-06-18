"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, ArrowLeft, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

interface DP {
  id: string;
  dealerId: string;
  productId: string;
  price: number;
  dealer: { id: string; company: string; name: string; group: string };
  product: { id: string; name: string; price: number };
}

interface DealerL { id: string; company: string; name: string; group: string; }
interface ProductL { id: string; name: string; price: number; }

export default function DealerPricesPage() {
  const [data, setData] = useState<DP[]>([]);
  const [dealers, setDealers] = useState<DealerL[]>([]);
  const [products, setProducts] = useState<ProductL[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ dealerId: "", productId: "", price: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    fetch("/api/admin/dealer-prices")
      .then((r) => r.json()).then((d) => setData(d.data || []));
  };

  const fetchRefs = () => {
    Promise.all([
      fetch("/api/admin/dealers").then((r) => r.json()),
      fetch("/api/products?all=true").then((r) => r.json()),
    ]).then(([d, p]) => {
      setDealers(d.data || []);
      setProducts(p.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); fetchRefs(); }, []);

  const handleSave = async () => {
    if (!form.dealerId || !form.productId || !form.price) return toast.error("Tüm alanları doldurun");
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, price: form.price } : form;
      const res = await fetch("/api/admin/dealer-prices", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Güncellendi" : "Eklendi");
        fetchData();
        setForm({ dealerId: "", productId: "", price: "" });
        setEditingId(null);
        setShowForm(false);
      } else toast.error(json.error || "Hata");
    } catch { toast.error("Hata"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu fiyat tanımını silmek istediğine emin misin?")) return;
    await fetch("/api/admin/dealer-prices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
    toast.success("Silindi");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bayiye Özel Fiyatlar</h1>
          <p className="mt-1 text-sm text-gray-500">Her bayi için ürün bazlı özel fiyat tanımla</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setForm({ dealerId: "", productId: "", price: "" }); setEditingId(null); setShowForm(true); }}>
            <Plus size={16} className="mr-1" /> Yeni Fiyat
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? "Fiyatı Düzenle" : "Yeni Özel Fiyat"}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase">Bayi</label>
              <select value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" disabled={!!editingId}>
                <option value="">Bayi seç</option>
                {dealers.map((d) => <option key={d.id} value={d.id}>{d.company} — {d.name} ({d.group})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase">Ürün</label>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" disabled={!!editingId}>
                <option value="">Ürün seç</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase">Özel Fiyat (₺)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="0.00" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> :
       data.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <DollarSign size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz özel fiyat tanımlanmadı</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Bayi</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Normal Fiyat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Özel Fiyat</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((dp) => (
                <tr key={dp.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{dp.dealer.company}</p><p className="text-xs text-gray-400">{dp.dealer.group}</p></td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{dp.product.name}</p></td>
                  <td className="px-4 py-3 text-gray-500">₺{dp.product.price.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <input type="number" defaultValue={dp.price}
                      onBlur={(e) => { const v = parseFloat(e.target.value); if (v && v !== dp.price) { fetch("/api/admin/dealer-prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: dp.id, price: v }) }).then(() => { fetchData(); toast.success("Güncellendi"); }); } }}
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-sm font-medium text-emerald-700 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(dp.id)} className="text-ena-primary hover:text-ena-primary">
                      <Trash2 size={14} />
                    </Button>
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
