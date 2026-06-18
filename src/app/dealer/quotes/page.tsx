"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { FileText, Plus, X, Minus, Plus as PlusIcon } from "lucide-react";

interface QuoteItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { name: string; image: string };
}

interface Quote {
  id: string;
  status: string;
  note: string;
  adminNote: string;
  total: number;
  items: QuoteItem[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  approved: "text-green-400 bg-green-500/10 border-green-500/30",
  rejected: "text-ena-primary bg-ena-primary/50/10 border-ena-primary/30",
  countered: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  countered: "Karşı Teklif",
};

export default function DealerQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number; image: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);

  const fetchData = useCallback(async () => {
    const [qRes, pRes] = await Promise.all([
      fetch("/api/dealer/quotes"),
      fetch("/api/products"),
    ]);
    setQuotes((await qRes.json()).data || []);
    setProducts((await pRes.json()).data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) return prev.map((c) => c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
    } else {
      setCart((prev) => prev.map((c) => c.productId === productId ? { ...c, quantity: qty } : c));
    }
  };

  const handleSubmit = async () => {
    await fetch("/api/dealer/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, note }),
    });
    setShowForm(false);
    setCart([]);
    setNote("");
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ena-text">Fiyat Teklifleri</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-ena-primary text-white rounded-lg text-sm hover:brightness-90 transition-colors flex items-center gap-2">
          <Plus size={16} /> Yeni Teklif
        </button>
      </div>

      {showForm && (
        <div className="bg-ena-card/30 border border-ena-border rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <h3 className="font-semibold text-ena-text">Teklif Oluştur</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                className="text-left text-xs px-3 py-2 rounded-lg border border-ena-border hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors truncate"
              >
                {p.name}
              </button>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="space-y-2">
              {cart.map((c) => {
                const p = products.find((pr) => pr.id === c.productId);
                return (
                  <div key={c.productId} className="flex items-center gap-3 text-sm bg-ena-card/20 rounded-lg p-2">
                    <span className="flex-1 text-ena-text truncate">{p?.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(c.productId, c.quantity - 1)} className="p-0.5 text-ena-light/40 hover:text-ena-light/70"><Minus size={14} /></button>
                      <span className="w-8 text-center font-medium">{c.quantity}</span>
                      <button onClick={() => updateQty(c.productId, c.quantity + 1)} className="p-0.5 text-ena-light/40 hover:text-ena-light/70"><PlusIcon size={14} /></button>
                    </div>
                    <button onClick={() => updateQty(c.productId, 0)} className="text-ena-light/40 hover:text-ena-primary"><X size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Açıklama (opsiyonel)"
            className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ena-border" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={cart.length === 0} className="px-4 py-2 bg-ena-primary text-white rounded-lg text-sm hover:brightness-90 disabled:opacity-50 transition-colors">Gönder</button>
            <button onClick={() => { setShowForm(false); setCart([]); }} className="px-4 py-2 border border-ena-border text-ena-light/70 rounded-lg text-sm hover:bg-ena-card/20 transition-colors">İptal</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {quotes.map((q) => (
          <div key={q.id} className="bg-ena-card/30 border border-ena-border rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-ena-light/40 font-mono">#{q.id.slice(0, 8)}</p>
                <p className="text-sm text-ena-light/50 mt-0.5">{formatDate(q.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[q.status]}`}>{statusLabels[q.status]}</span>
                <p className="text-lg font-bold text-ena-text mt-1">{formatPrice(q.total)}</p>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              {q.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ena-light/70">{item.product.name} x{item.quantity}</span>
                  <span className="font-medium text-ena-text">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            {q.note && <p className="text-xs text-ena-light/50 mb-1"><b>Not:</b> {q.note}</p>}
            {q.adminNote && <p className="text-xs text-purple-600"><b>Admin:</b> {q.adminNote}</p>}
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="text-center py-16 text-ena-light/40 border border-dashed border-ena-border rounded-xl">
            <FileText size={40} className="mx-auto mb-2 text-ena-light/30" />
            <p>Henüz teklif yok</p>
          </div>
        )}
      </div>
    </div>
  );
}
