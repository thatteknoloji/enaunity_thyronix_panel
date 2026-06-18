"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Package, Warehouse, Barcode, X } from "lucide-react";

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  modelCode: string;
  stock: number;
  image: string;
  warehouseStocks: { stock: number; warehouse: { id: string; name: string } }[];
}

export default function StockScanPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductStock[]>([]);
  const [selected, setSelected] = useState<ProductStock | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/stock-transfer?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      setResults(d.data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && results.length > 0) {
      setSelected(results[0]);
      setQuery("");
      setResults([]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok Sorgulama</h1>
        <p className="text-sm text-gray-500 mt-1">Barkod, SKU veya ürün adı ile sorgulayın</p>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Barkod okutun veya ürün adı yazın..."
          className="w-full rounded-xl border-2 border-gray-200 pl-12 pr-10 py-4 text-lg focus:outline-none focus:border-gray-900 transition-colors bg-white"
          autoFocus
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick results dropdown */}
      {results.length > 0 && !selected && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-6">
          {results.map((p) => (
            <button key={p.id} onClick={() => { setSelected(p); setQuery(""); setResults([]); }}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left">
              <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">SKU: {p.sku} · Barkod: {p.barcode}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{p.stock}</p>
                <p className="text-[10px] text-gray-400">toplam stok</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-2" />
          <p className="text-sm">Aranıyor...</p>
        </div>
      )}

      {/* Selected product detail */}
      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
              <X size={12} /> Yeni sorgulama
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="h-20 w-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                <img src={selected.image} alt={selected.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">SKU</p>
                    <p className="font-medium text-gray-900">{selected.sku || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Barkod</p>
                    <p className="font-medium text-gray-900">{selected.barcode || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Model Kod</p>
                    <p className="font-medium text-gray-900">{selected.modelCode || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Warehouse size={16} /> Depo Stokları
            </h3>
            <div className="space-y-2">
              {selected.warehouseStocks.length > 0 ? (
                selected.warehouseStocks.map((ws) => (
                  <div key={ws.warehouse.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{ws.warehouse.name}</span>
                    <span className="text-sm font-bold text-gray-900">{ws.stock} adet</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">Depo kaydı bulunamadı</p>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900 text-white">
                <span className="text-sm font-medium">Toplam Stok</span>
                <span className="text-sm font-bold">{selected.stock} adet</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <Barcode size={14} />
                Barkod okuyucu ile hızlı sorgulama için kutucuğa odaklanın ve barkodu okutun
              </p>
            </div>
          </div>
        </div>
      )}

      {!selected && results.length === 0 && !loading && query.length > 0 && query.length >= 2 && (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-2 text-gray-300" />
          <p>Sonuç bulunamadı</p>
        </div>
      )}

      {!selected && results.length === 0 && !loading && query.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Barcode size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Barkod okutun veya ürün adı yazarak stok sorgulayın</p>
        </div>
      )}
    </div>
  );
}
