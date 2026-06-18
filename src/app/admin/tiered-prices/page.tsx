"use client";

import { useEffect, useState, useCallback } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";

interface Tier {
  id: string;
  productId: string;
  minQuantity: number;
  price: number;
  product: { name: string };
}

interface Product {
  id: string;
  name: string;
}

export default function AdminTieredPricesPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ productId: "", minQuantity: 1, price: 0 });
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    const [tRes, pRes] = await Promise.all([
      fetch("/api/admin/tiered-prices"),
      fetch("/api/admin/products?all=true"),
    ]);
    setTiers((await tRes.json()).data || []);
    setProducts((await pRes.json()).data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/tiered-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ productId: "", minQuantity: 1, price: 0 });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/admin/tiered-prices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Toplu Sipariş Fiyatları</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Yeni Kademe
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Ürün seçin</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={1} value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: parseInt(e.target.value) || 1 })}
              placeholder="Min. adet" required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              placeholder="Birim fiyat" required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Kaydet</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Min. Adet</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Birim Fiyat</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{t.product.name}</td>
                  <td className="px-4 py-3 text-gray-700">{t.minQuantity}+ adet</td>
                  <td className="px-4 py-3 text-gray-900 font-mono">{t.price.toFixed(2)} TL</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-ena-primary hover:text-ena-primary transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tiers.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Layers size={40} className="mx-auto mb-2 text-gray-300" />
            <p>Henüz kademe fiyatı yok</p>
          </div>
        )}
      </div>
    </div>
  );
}
