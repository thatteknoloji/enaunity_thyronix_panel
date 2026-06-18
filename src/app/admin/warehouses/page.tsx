"use client";

import { useEffect, useState, useCallback } from "react";
import { Warehouse as WarehouseIcon, Plus, X, MapPin, Package } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface Warehouse {
  id: string;
  name: string;
  location: string;
  isDefault: boolean;
  stocks: { id: string; productId: string; stock: number; product: { name: string } }[];
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{ warehouseId: string; warehouseName: string } | null>(null);
  const [stockForm, setStockForm] = useState({ productId: "", stock: 0 });
  const [healthIssues, setHealthIssues] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", location: "", isDefault: false });

  const fetchData = useCallback(async () => {
    const [wRes, pRes, hRes] = await Promise.all([
      fetch("/api/admin/warehouses"),
      fetch("/api/products?all=true"),
      fetch("/api/admin/warehouses/health"),
    ]);
    const w = await wRes.json();
    const p = await pRes.json();
    const h = await hRes.json();
    setWarehouses(w.data || []);
    setProducts(p.data || []);
    setHealthIssues(h.data?.issues || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", location: "", isDefault: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Depoyu silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/warehouses/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal) return;
    await fetch("/api/admin/warehouses/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...stockForm, warehouseId: stockModal.warehouseId }),
    });
    setStockModal(null);
    setStockForm({ productId: "", stock: 0 });
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Depo Yönetimi</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Depo Ekle
        </button>
      </div>

      {healthIssues.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900 mb-2">Stok Tutarlılık Uyarıları ({healthIssues.length})</div>
          <ul className="text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto">
            {healthIssues.slice(0, 8).map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Depo adı" required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Konum"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-gray-300" />
              Varsayılan Depo
            </label>
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Kaydet</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <WarehouseIcon size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">{w.name} {w.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Varsayılan</span>}</h3>
                  {w.location && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} />{w.location}</p>}
                </div>
              </div>
              <button onClick={() => handleDelete(w.id)} className="text-gray-400 hover:text-ena-primary transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-1 mb-3">
              {w.stocks.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{s.product.name}</span>
                  <span className="font-medium text-gray-900">{s.stock} adet</span>
                </div>
              ))}
              {w.stocks.length === 0 && <p className="text-xs text-gray-400">Bu depoda stok kaydı yok</p>}
            </div>
            <button onClick={() => setStockModal({ warehouseId: w.id, warehouseName: w.name })} className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
              <Package size={14} /> Stok Yönet
            </button>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <WarehouseIcon size={40} className="mx-auto mb-2 text-gray-300" />
            <p>Henüz depo eklenmemiş</p>
          </div>
        )}
      </div>

      {stockModal && (
        <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`${stockModal.warehouseName} — Stok Yönet`}>
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <select value={stockForm.productId} onChange={(e) => setStockForm({ ...stockForm, productId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Ürün seç</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={0} value={stockForm.stock} onChange={(e) => setStockForm({ ...stockForm, stock: parseInt(e.target.value) || 0 })}
              placeholder="Stok miktarı"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Kaydet</button>
              <button type="button" onClick={() => setStockModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">İptal</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
