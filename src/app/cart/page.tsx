"use client";

import Link from "next/link";
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft, ShoppingCart, ChevronRight } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function CartPage() {
  const { items, fetchCart, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex flex-col items-center justify-center gap-4 text-ena-light">
          <ShoppingBag size={72} className="text-ena-border" />
          <h1 className="text-2xl font-bold text-ena-text">Sepetin Boş</h1>
          <p className="text-ena-light">Henüz sepete ürün eklemediniz.</p>
          <Link href="/catalog">
            <Button size="lg" className="mt-2 gap-2">
              <ShoppingCart size={18} />
              Alışverişe Başla
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/catalog" className="rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Sepetim</h1>
          <p className="text-sm text-ena-light">{itemCount} ürün</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-lg border border-ena-border bg-ena-card p-4">
              <Link href={`/products/${item.productId}`} className="shrink-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-24 w-24 rounded-lg object-cover sm:h-28 sm:w-28"
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div>
                  <Link
                    href={`/products/${item.productId}`}
                    className="text-sm font-semibold text-ena-text hover:underline line-clamp-2"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-base font-bold text-ena-primary">
                    {formatPrice(item.product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center rounded-lg border border-ena-border">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="p-2 text-ena-light hover:text-ena-text hover:bg-white/5 transition-colors rounded-l-lg"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm text-ena-text select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-ena-light hover:text-ena-text hover:bg-white/5 transition-colors rounded-r-lg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg p-2 text-ena-light hover:text-ena-primary hover:bg-red-400/10 transition-colors"
                    title="Kaldır"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end justify-between">
                <p className="text-sm font-semibold text-ena-text">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-ena-border bg-ena-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-ena-text">Sipariş Özeti</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ena-light">
                <span>Ürün Toplamı ({itemCount} adet)</span>
                <span className="text-ena-text">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-ena-light">
                <span>Kargo</span>
                <span className="text-ena-text">Hesaplanıyor</span>
              </div>
              <div className="border-t border-ena-border pt-2 flex justify-between font-bold text-ena-text">
                <span>Toplam</span>
                <span className="text-ena-primary">{formatPrice(total)}</span>
              </div>
            </div>
            <Link href="/checkout">
              <Button size="lg" className="w-full gap-2 text-base">
                Sepeti Onayla
                <ChevronRight size={18} />
              </Button>
            </Link>
            <Link href="/catalog">
              <Button variant="outline" size="sm" className="w-full text-ena-light">
                Alışverişe Devam Et
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
