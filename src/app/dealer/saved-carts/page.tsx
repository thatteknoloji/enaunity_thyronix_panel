"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { ShoppingCart, Trash2, Package, Plus, Loader2, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface SavedCartItem {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; price: number; image: string };
}

interface SavedCart {
  id: string;
  name: string;
  total: number;
  items: SavedCartItem[];
  createdAt: string;
}

export default function SavedCartsPage() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [carts, setCarts] = useState<SavedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    fetch("/api/dealer/saved-carts").then(r => r.json()).then(d => {
      if (d.success) setCarts(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (cart: SavedCart) => {
    setAdding(cart.id);
    let success = 0;
    for (const item of cart.items) {
      try {
        await addItem(item.productId, item.quantity);
        success++;
      } catch { /* skip */ }
    }
    if (success > 0) {
      toast.success(`${success} ürün sepete eklendi`);
      router.push("/cart");
    }
    setAdding(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sepet şablonu silinsin mi?")) return;
    const res = await fetch(`/api/dealer/saved-carts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCarts(prev => prev.filter(c => c.id !== id));
      toast.success("Silindi");
    }
  };

  const saveCurrentCart = async () => {
    if (!newName.trim()) return;
    setSavingNew(true);
    try {
      const cartRes = await fetch("/api/cart");
      const cartData = await cartRes.json();
      if (!cartData.success || !cartData.data?.items?.length) {
        toast.error("Sepetiniz boş");
        return;
      }
      const items = cartData.data.items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.effectivePrice ?? i.product.price,
      }));
      const res = await fetch("/api/dealer/saved-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, items }),
      });
      const d = await res.json();
      if (d.success) {
        setCarts(prev => [d.data, ...prev]);
        setShowNew(false);
        setNewName("");
        toast.success("Sepet kaydedildi");
      }
    } catch {
      toast.error("Kaydedilemedi");
    }
    setSavingNew(false);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-64 rounded bg-ena-card/50" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Kaydedilmiş Sepetler</h1>
          <p className="text-sm text-ena-light/70 mt-0.5">Sık kullandığınız sipariş şablonlarınız</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)} className="gap-2"><Plus size={16} /> Yeni Kaydet</Button>
      </div>

      {showNew && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 space-y-3">
          <p className="text-sm font-semibold text-ena-text">Mevcut Sepeti Kaydet</p>
          <div className="flex gap-2">
            <Input placeholder="Sepet adı (örn: Haftalık Bakkal Listesi)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button onClick={saveCurrentCart} disabled={savingNew || !newName.trim()}>
              {savingNew ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
              Kaydet
            </Button>
          </div>
        </div>
      )}

      {carts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl bg-ena-card/30">
          <Package size={48} className="mx-auto text-ena-light/20" />
          <p className="mt-3 text-ena-light/50">Henüz kaydedilmiş sepet yok</p>
          <p className="text-xs text-ena-light/40 mt-1">Sık sipariş ettiğiniz ürünleri şablon olarak kaydedin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {carts.map(cart => (
            <div key={cart.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-5 hover:border-ena-border/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ena-text">{cart.name}</h3>
                <button onClick={() => handleDelete(cart.id)} className="text-ena-light/30 hover:text-ena-primary transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cart.items.slice(0, 10).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <img src={item.product.image} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    <span className="flex-1 text-xs text-ena-text truncate">{item.product.name}</span>
                    <span className="text-xs text-ena-light/60">x{item.quantity}</span>
                    <span className="text-xs font-medium text-ena-text">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                {cart.items.length > 10 && (
                  <p className="text-xs text-ena-light/40">+{cart.items.length - 10} ürün daha</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-ena-border flex items-center justify-between">
                <p className="text-sm font-bold text-ena-text">{formatPrice(cart.total)}</p>
                <Button size="sm" onClick={() => handleAddToCart(cart)} disabled={adding === cart.id} className="gap-1.5">
                  {adding === cart.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                  Sepete Ekle
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
