"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { Search, Plus, Package, Trash2, ShoppingCart, Upload, AlertTriangle, Check, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface LookupProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  image: string;
  stock: number;
  minOrderQuantity: number;
}

interface CartEntry {
  productId: string;
  product: LookupProduct;
  quantity: number;
}

export default function QuickOrderPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [showCsv, setShowCsv] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products/lookup?q=${encodeURIComponent(query)}`);
        const d = await res.json();
        if (d.success) setResults(d.data);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const addProduct = (product: LookupProduct, quantity?: number) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.productId === product.id);
      if (existing) {
        return prev.map((e) =>
          e.productId === product.id
            ? { ...e, quantity: e.quantity + (quantity || product.minOrderQuantity || 1) }
            : e
        );
      }
      return [...prev, { productId: product.id, product, quantity: quantity || product.minOrderQuantity || 1 }];
    });
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setEntries((prev) => prev.filter((e) => e.productId !== productId));
      return;
    }
    setEntries((prev) =>
      prev.map((e) => (e.productId === productId ? { ...e, quantity } : e))
    );
  };

  const removeEntry = (productId: string) => {
    setEntries((prev) => prev.filter((e) => e.productId !== productId));
  };

  const handleAddToCart = async () => {
    if (entries.length === 0) return;
    setAdding(true);
    let success = 0;
    let errors = 0;
    for (const entry of entries) {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: entry.productId, quantity: entry.quantity }),
        });
        if (res.ok) success++;
        else errors++;
      } catch {
        errors++;
      }
    }
    if (success > 0) {
      toast.success(`${success} ürün sepete eklendi`);
      setEntries([]);
    }
    if (errors > 0) toast.error(`${errors} ürün eklenemedi`);
    setAdding(false);
  };

  const parseCsv = () => {
    const lines = csvInput.trim().split("\n").filter(Boolean);
    const errors: string[] = [];
    const newEntries: CartEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]+/).map((s) => s.trim());
      const code = parts[0]?.trim() || "";
      const qty = parseInt(parts[1]?.trim(), 10) || 1;
      if (!code) { errors.push(`Satır ${i + 1}: Kod girilmedi`); continue; }
      newEntries.push({ productId: code, product: { id: code, name: code, sku: code, barcode: "", price: 0, image: "", stock: 0, minOrderQuantity: 1 }, quantity: Math.max(1, qty) });
    }

    if (newEntries.length > 0) {
      resolveCsvEntries(newEntries);
    }
    setCsvErrors(errors);
  };

  const resolveCsvEntries = async (raw: CartEntry[]) => {
    for (const entry of raw) {
      try {
        const res = await fetch(`/api/products/lookup?q=${encodeURIComponent(entry.productId)}`);
        const d = await res.json();
        if (d.success && d.data.length > 0) {
          const product = d.data[0];
          addProduct(product, entry.quantity);
        } else {
          setCsvErrors((prev) => [...prev, `"${entry.productId}" bulunamadı`]);
        }
      } catch {
        setCsvErrors((prev) => [...prev, `"${entry.productId}" sorgulanamadı`]);
      }
    }
    setCsvInput("");
  };

  const totalItems = entries.reduce((s, e) => s + e.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Hızlı Sipariş</h1>
          <p className="text-sm text-ena-light/70 mt-0.5">SKU, barkod veya ürün adı ile hızlı sipariş oluşturun</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowCsv(!showCsv); setCsvErrors([]); }} className="gap-1.5 border-ena-border text-ena-light">
            <Upload size={15} /> CSV Yükle
          </Button>
          <Button size="sm" onClick={() => router.push("/products")} className="gap-1.5">
            <ShoppingCart size={15} /> Katalog
          </Button>
        </div>
      </div>

      {/* CSV Import */}
      {showCsv && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ena-text">CSV ile Toplu Ekle</p>
            <button onClick={() => { setShowCsv(false); setCsvErrors([]); }} className="text-ena-light hover:text-ena-text"><X size={16} /></button>
          </div>
          <p className="text-xs text-ena-light/60">Her satıra bir ürün: <code className="bg-ena-card/50 px-1 rounded">SKU, adet</code> veya <code className="bg-ena-card/50 px-1 rounded">barkod;adet</code></p>
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={`Örnek:\nABC-123, 50\nDEF-456, 100\nGHI-789, 25`}
            rows={5}
            className="w-full rounded-lg border border-ena-border bg-ena-dark/50 p-3 text-sm text-ena-text placeholder:text-ena-light/30 font-mono focus:outline-none focus:border-ena-primary resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={parseCsv} disabled={!csvInput.trim()} className="gap-1.5">
              <Upload size={14} /> Ürünleri Ekle
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCsvInput("")} className="border-ena-border text-ena-light">
              Temizle
            </Button>
          </div>
          {csvErrors.length > 0 && (
            <div className="space-y-1">
              {csvErrors.map((err, i) => (
                <p key={i} className="text-xs text-ena-primary flex items-center gap-1"><AlertTriangle size={12} /> {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Input
          ref={inputRef}
          label="Ürün Ara"
          placeholder="SKU, barkod veya ürün adı girin..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) addProduct(results[0]);
          }}
        />
        <Search size={16} className="absolute right-3 top-[38px] text-ena-light/40 pointer-events-none" />

        {showDropdown && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-ena-border bg-ena-card shadow-xl backdrop-blur-xl overflow-hidden">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-ena-dark/50 transition-colors border-b border-ena-border/50 last:border-0"
              >
                <img src={p.image} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ena-text truncate">{p.name}</p>
                  <p className="text-xs text-ena-light/50">
                    {p.sku && `SKU: ${p.sku}`}{p.barcode && ` · Barkod: ${p.barcode}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-ena-text">{formatPrice(p.price)}</p>
                  <p className="text-xs text-ena-light/50">Stok: {p.stock}</p>
                </div>
                <div className="shrink-0">
                  <Plus size={16} className="text-ena-primary" />
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && searching && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-ena-border bg-ena-card shadow-xl p-4 text-center text-sm text-ena-light/50">
            <Loader2 size={16} className="inline animate-spin mr-2" />Aranıyor...
          </div>
        )}
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-ena-border flex items-center justify-between">
            <p className="text-sm font-semibold text-ena-text">Sipariş Listesi ({totalItems} ürün)</p>
            <button onClick={() => setEntries([])} className="text-xs text-ena-primary hover:text-red-300">Temizle</button>
          </div>
          <div className="divide-y divide-ena-border max-h-96 overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.productId} className="flex items-center gap-3 px-5 py-3 hover:bg-ena-card/20">
                <img src={entry.product.image} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ena-text truncate">{entry.product.name}</p>
                  <p className="text-xs text-ena-light/50">{entry.product.sku && `SKU: ${entry.product.sku}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(entry.productId, entry.quantity - 1)}
                    className="w-7 h-7 rounded border border-ena-border flex items-center justify-center text-ena-light hover:text-ena-text transition-colors"
                  >−</button>
                  <input
                    type="number"
                    value={entry.quantity}
                    min={1}
                    onChange={(e) => updateQty(entry.productId, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center text-sm bg-ena-dark/50 border border-ena-border rounded py-1 text-ena-text focus:outline-none focus:border-ena-primary"
                  />
                  <button
                    onClick={() => updateQty(entry.productId, entry.quantity + 1)}
                    className="w-7 h-7 rounded border border-ena-border flex items-center justify-center text-ena-light hover:text-ena-text transition-colors"
                  >+</button>
                </div>
                <p className="text-sm font-bold text-ena-text w-24 text-right">{formatPrice(entry.product.price * entry.quantity)}</p>
                <button onClick={() => removeEntry(entry.productId)} className="text-ena-light/40 hover:text-ena-primary transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-ena-border bg-ena-card/20 flex items-center justify-between">
            <div>
              <p className="text-sm text-ena-light/70">{entries.length} ürün · {totalItems} adet</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold text-ena-text">
                {formatPrice(entries.reduce((s, e) => s + e.product.price * e.quantity, 0))}
              </p>
              <Button onClick={handleAddToCart} disabled={adding} className="gap-2">
                {adding ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                Sepete Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick tips */}
      {entries.length === 0 && !showCsv && (
        <div className="rounded-xl border border-dashed border-ena-border bg-ena-card/20 p-8 text-center">
          <Package size={48} className="mx-auto text-ena-light/20" />
          <h3 className="mt-4 text-lg font-semibold text-ena-text">Sipariş Listeniz Boş</h3>
          <p className="text-sm text-ena-light/50 mt-1 max-w-md mx-auto">
            Yukarıdaki arama kutusuna SKU, barkod veya ürün adı girerek hızlıca ürün ekleyin.
            Alternatif olarak CSV yükleyerek toplu sipariş girebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
