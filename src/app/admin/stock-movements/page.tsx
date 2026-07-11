"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Package, ArrowDownCircle, ArrowUpCircle, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  note: string;
  createdAt: string;
  product: { name: string; image: string };
}

export default function StockMovementsPage() {
  const [data, setData] = useState<Movement[]>([]);
  const [operasyonMoves, setOperasyonMoves] = useState<any[]>([]);
  const [showOperasyon, setShowOperasyon] = useState(true);
  const [products, setProducts] = useState<{ id: string; name: string; stock: number; minStockLevel: number; maxStockLevel: number }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", type: "entry", quantity: 1, note: "" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [toastWarnings, setToastWarnings] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    const [mRes, pRes, opRes] = await Promise.all([
      fetch("/api/admin/stock-movements"),
      fetch("/api/products?all=true"),
      fetch("/api/fulfillment/dashboard?type=warehouse").catch(() => null),
    ]);
    const m = await mRes.json();
    const p = await pRes.json();
    if (opRes?.ok) {
      const op = await opRes.json();
      if (op.success) setOperasyonMoves(op.data || []);
    }
    setData(m.data || []);
    setProducts(p.data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedProduct = products.find(p => p.id === form.productId);
  const estimatedStock = selectedProduct ? (
    form.type === "entry"
      ? selectedProduct.stock + form.quantity
      : selectedProduct.stock - form.quantity
  ) : 0;

  useEffect(() => {
    if (!selectedProduct) { setWarnings([]); return; }
    const w: string[] = [];
    if (form.type === "exit" || form.type === "adjustment") {
      if (selectedProduct.minStockLevel > 0 && estimatedStock <= selectedProduct.minStockLevel && estimatedStock > 0) {
        w.push(`Kritik: ${selectedProduct.name} stoku ${estimatedStock} (min: ${selectedProduct.minStockLevel})`);
      }
      if (estimatedStock <= 0) {
        w.push(`Uyarı: ${selectedProduct.name} stokta tükenecek`);
      }
    }
    if (form.type === "entry") {
      if (selectedProduct.maxStockLevel > 0 && estimatedStock >= selectedProduct.maxStockLevel) {
        w.push(`Uyarı: ${selectedProduct.name} stoku ${estimatedStock} (max: ${selectedProduct.maxStockLevel})`);
      }
    }
    setWarnings(w);
  }, [form.productId, form.type, form.quantity, selectedProduct, estimatedStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/stock-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    if (result.warnings?.length) {
      setToastWarnings(result.warnings);
      setTimeout(() => setToastWarnings([]), 5000);
    }
    setShowForm(false);
    setForm({ productId: "", type: "entry", quantity: 1, note: "" });
    fetchData();
  };

  const typeIcon: Record<string, { icon: React.ReactNode; color: string }> = {
    entry: { icon: <ArrowDownCircle size={16} />, color: "text-green-600" },
    exit: { icon: <ArrowUpCircle size={16} />, color: "text-ena-primary" },
    adjustment: { icon: <RefreshCw size={16} />, color: "text-amber-600" },
    return: { icon: <RotateCcw size={16} />, color: "text-blue-600" },
  };

  const typeLabel: Record<string, string> = {
    entry: "Giriş",
    exit: "Çıkış",
    adjustment: "Düzeltme",
    return: "İade",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Hareketleri</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {data.length} hareket</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          Stok Giriş/Çıkış
        </button>
      </div>

      {toastWarnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {toastWarnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle size={14} className="shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      {operasyonMoves.length > 0 && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOperasyon(!showOperasyon)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-indigo-900"
          >
            Operasyon depo hareketleri ({operasyonMoves.length})
            <span className="text-xs text-indigo-600">{showOperasyon ? "Gizle" : "Göster"}</span>
          </button>
          {showOperasyon && (
            <div className="border-t border-indigo-100 divide-y divide-indigo-100 max-h-64 overflow-y-auto bg-white">
              {operasyonMoves.slice(0, 30).map((m: any) => (
                <div key={m.id} className="px-4 py-2.5 text-xs flex justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-800">{m.sku || m.catalogItem?.name || m.product?.name || "—"}</span>
                    <span className="text-gray-500 ml-2">{m.movementType} · {m.quantity} adet</span>
                    {m.orderNumber && <span className="text-gray-400 ml-1">· {m.orderNumber}</span>}
                  </div>
                  <span className="text-gray-400 shrink-0">{m.engine === "core" ? "Çekirdek" : "Operasyon"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Ürün seç</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stok: {p.stock}{p.minStockLevel > 0 ? `, min: ${p.minStockLevel}` : ""}{p.maxStockLevel > 0 ? `, max: ${p.maxStockLevel}` : ""})
                </option>
              ))}
            </select>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="entry">Stok Giriş</option>
              <option value="exit">Stok Çıkış</option>
              <option value="adjustment">Düzeltme</option>
            </select>
            <input
              type="number" min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              placeholder="Miktar"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Açıklama"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                  <AlertTriangle size={12} className="shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {selectedProduct && (
            <div className="text-xs text-gray-500 flex gap-4">
              <span>Mevcut: <strong>{selectedProduct.stock}</strong></span>
              <span>Tahmini: <strong className={estimatedStock <= 0 ? "text-ena-primary" : estimatedStock <= (selectedProduct.minStockLevel || -1) ? "text-amber-600" : "text-emerald-600"}>{estimatedStock}</strong></span>
              {selectedProduct.minStockLevel > 0 && <span>Min: <strong>{selectedProduct.minStockLevel}</strong></span>}
              {selectedProduct.maxStockLevel > 0 && <span>Max: <strong>{selectedProduct.maxStockLevel}</strong></span>}
            </div>
          )}

          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Kaydet</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {data.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className={`${typeIcon[m.type]?.color || "text-gray-400"}`}>
                {typeIcon[m.type]?.icon || <Package size={16} />}
              </div>
              <img src={m.product.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.product.name}</p>
                <p className="text-xs text-gray-500 truncate">{m.note || typeLabel[m.type] || m.type}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${m.type === "entry" || m.type === "return" ? "text-green-600" : "text-ena-primary"}`}>
                  {m.type === "entry" || m.type === "return" ? "+" : "-"}{m.quantity}
                </p>
                <p className="text-xs text-gray-400">{formatDate(m.createdAt)}</p>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-2 text-gray-300" />
              <p>Henüz stok hareketi yok</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
