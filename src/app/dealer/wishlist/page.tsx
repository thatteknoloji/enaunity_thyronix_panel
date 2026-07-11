"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, ChevronLeft, Package } from "lucide-react";
import toast from "react-hot-toast";

interface FavoriteItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    stock: number;
  };
}

export default function DealerWishlist() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = () => {
    setLoading(true);
    fetch("/api/dealer/wishlist")
      .then(r => r.json())
      .then(d => { if (d.success) setItems(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFavorites(); }, []);

  const removeFavorite = async (productId: string) => {
    const res = await fetch(`/api/dealer/wishlist/${productId}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      toast.success("Favorilerden kaldırıldı");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-ena-card/50 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-xl bg-ena-card/30 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dealer" className="inline-flex items-center gap-1 text-sm text-ena-light/70 hover:text-ena-text transition-colors mb-2">
            <ChevronLeft size={14} /> Ana Sayfa
          </Link>
          <h1 className="text-2xl font-bold text-ena-text flex items-center gap-2">
            <Heart size={22} className="text-ena-primary" /> Favorilerim
          </h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-ena-border rounded-xl">
          <Heart size={48} className="mx-auto text-ena-light/20" />
          <p className="mt-4 text-ena-light/50 text-sm">Henüz favori ürününüz bulunmuyor</p>
          <Link href="/catalog">
            <Button variant="outline" className="mt-4 border-ena-border text-ena-light">
              <Package size={15} className="mr-1.5" /> Kataloğa Göz At
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="group relative rounded-xl border border-ena-border bg-ena-card/30 p-3 hover:bg-ena-card/50 transition-all duration-300">
              <Link href={`/products/${item.productId}`}>
                <div className="aspect-square rounded-lg overflow-hidden bg-ena-card mb-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-sm font-medium text-ena-text truncate">{item.product.name}</h3>
                <p className="text-xs text-ena-light/50 mt-0.5">{item.product.category}</p>
                <p className="text-sm font-bold text-ena-primary mt-2">{formatPrice(item.product.price)}</p>
              </Link>
              <div className="flex items-center gap-2 mt-3">
                <Link href={`/products/${item.productId}`} className="flex-1">
                  <Button size="sm" className="w-full text-xs" disabled={item.product.stock < 1}>
                    <ShoppingCart size={13} className="mr-1" /> Sepete Ekle
                  </Button>
                </Link>
                <button
                  onClick={() => removeFavorite(item.productId)}
                  className="p-2 rounded-lg text-ena-light/50 hover:text-ena-primary hover:bg-ena-primary/50/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
