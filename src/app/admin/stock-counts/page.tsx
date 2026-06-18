"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, Plus, X, Play, CheckCircle, AlertTriangle, Search } from "lucide-react";

interface StockCount {
  id: string;
  name: string;
  warehouseId: string | null;
  warehouse: { name: string } | null;
  status: string;
  notes: string;
  _count: { items: number };
  createdAt: string;
}

interface CountItem {
  id: string;
  productId: string;
  product: { name: string; sku: string; barcode: string; image: string };
  systemStock: number;
  actualStock: number | null;
  difference: number;
  note: string;
}

interface FullCount extends StockCount {
  items: CountItem[];
}

const STATUS_MAP: Record<string, string> = {
  draft: "Taslak",
  in_progress: "Sayım Yapılıyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-ena-primary/10 text-ena-primary",
};

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCount, setSelectedCount] = useState<FullCount | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", warehouseId: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchCounts = useCallback(async () => {
    const [cRes, wRes] = await Promise.all([
      fetch("/api/admin/stock-counts"),
      fetch("/api/admin/warehouses"),
    ]);
    setCounts((await cRes.json()).data || []);
    setWarehouses((await wRes.json()).data || []);
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const openCount = async (id: string) => {
    const res = await fetch(`/api/admin/stock-counts/${id}`);
    const d = await res.json();
    setSelectedCount(d.data);
  };

  const createCount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/stock-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      setToast({ type: "success", msg: "Sayım oluşturuldu" });
      setShowCreate(false);
      setForm({ name: "", warehouseId: "" });
      fetchCounts();
      openCount(d.data.id);
    } else {
      setToast({ type: "error", msg: d.error || "Hata" });
    }
  };

  const startCount = async (id: string) => {
    await fetch(`/api/admin/stock-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", status: "in_progress" }),
    });
    await fetch(`/api/admin/stock-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-items" }),
    });
    setToast({ type: "success", msg: "Ürünler eklendi, sayıma başlayabilirsiniz" });
    fetchCounts();
    openCount(id);
  };

  const updateItem = async (itemId: string, actualStock: number, note: string) => {
    if (!selectedCount) return;
    const res = await fetch(`/api/admin/stock-counts/${selectedCount.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-stock", itemId, actualStock, note }),
    });
    const d = await res.json();
    if (d.success) {
      openCount(selectedCount.id);
    }
  };

  const completeCount = async (id: string) => {
    if (!confirm("Sayımı tamamlamak stokları günceller. Emin misiniz?")) return;
    const res = await fetch(`/api/admin/stock-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    const d = await res.json();
    if (d.success) {
      setToast({ type: "success", msg: `Sayım tamamlandı, ${d.data.adjusted} ürün güncellendi` });
      fetchCounts();
      setSelectedCount(null);
    } else {
      setToast({ type: "error", msg: d.error || "Hata" });
    }
  };

  const filteredItems = selectedCount?.items.filter((i) =>
    !searchQuery || i.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.product.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const hasDifferences = selectedCount?.items.some((i) => i.actualStock !== null && i.difference !== 0);

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Sayımı</h1>
          <p className="text-sm text-gray-500 mt-1">{counts.filter((c) => c.status === "in_progress").length} aktif sayım</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Yeni Sayım
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createCount} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sayım adı" required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Tüm depolar</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Oluştur</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">İptal</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Count list */}
        <div className={selectedCount ? "lg:col-span-1" : "lg:col-span-3"}>
          <div className="space-y-3">
            {counts.map((c) => (
              <div key={c.id}
                onClick={() => openCount(c.id)}
                className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  selectedCount?.id === c.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{c.name}</h3>
                    {c.warehouse && <p className="text-xs text-gray-500">{c.warehouse.name}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                    {STATUS_MAP[c.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{c._count.items} ürün</span>
                  <span>{new Date(c.createdAt).toLocaleDateString("tr-TR")}</span>
                </div>
                {c.status === "draft" && (
                  <button onClick={(e) => { e.stopPropagation(); startCount(c.id); }}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                    <Play size={12} /> Sayıma Başla
                  </button>
                )}
              </div>
            ))}
            {counts.length === 0 && (
              <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <ClipboardCheck size={40} className="mx-auto mb-2 text-gray-300" />
                <p>Henüz sayım yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Count detail */}
        {selectedCount && (
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedCount.name}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedCount.items.length} ürün · {selectedCount.items.filter((i) => i.actualStock !== null).length} sayıldı
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCount.status === "in_progress" && (
                      <button onClick={() => completeCount(selectedCount.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1">
                        <CheckCircle size={14} /> Sayımı Bitir
                      </button>
                    )}
                  </div>
                </div>
                {hasDifferences && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertTriangle size={14} />
                    Farklılık tespit edilen ürünler var. Sayımı bitirince stoklar otomatik güncellenir.
                  </div>
                )}
                <div className="relative mt-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ürün ara (isim, SKU, barkod)..."
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredItems.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded bg-gray-100 overflow-hidden shrink-0">
                        <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {item.product.sku || "—"} · Barkod: {item.product.barcode || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-gray-500">Sistem</p>
                          <p className="font-semibold text-gray-900">{item.systemStock}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Sayılan</p>
                          {item.actualStock !== null ? (
                            <p className="font-semibold text-gray-900">{item.actualStock}</p>
                          ) : selectedCount.status === "in_progress" ? (
                            <input type="number" min={0} placeholder="—"
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) updateItem(item.id, val, "");
                              }}
                              className="w-16 text-center rounded border border-gray-200 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500">Fark</p>
                          {item.actualStock !== null ? (
                            <p className={`font-semibold ${item.difference > 0 ? "text-emerald-600" : item.difference < 0 ? "text-ena-primary" : "text-gray-400"}`}>
                              {item.difference > 0 ? "+" : ""}{item.difference}
                            </p>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">Eşleşen ürün yok</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
