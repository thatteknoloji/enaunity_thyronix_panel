"use client";

import Link from "next/link";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, updateQuantity, removeItem } = useCartStore();

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
      <Drawer open={open} onClose={onClose} size="md" className="bg-ena-dark border-ena-border">
      <div className="flex items-center justify-between border-b border-ena-border pb-3 mb-4 px-5">
        <h2 className="text-lg font-semibold text-ena-text">Sepetim</h2>
        <button onClick={onClose} className="rounded-full p-1 text-ena-text-muted hover:text-ena-text hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ena-text-muted h-full">
          <ShoppingBag size={48} />
          <p>Sepetin boş</p>
          <Button variant="outline" onClick={onClose}>
            Alışverişe Başla
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-full px-5">
          <div className="flex-1 overflow-y-auto space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-ena-border pb-4">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-20 w-20 rounded object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`} className="text-sm font-medium text-ena-text hover:underline line-clamp-2">
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-ena-primary">{formatPrice(item.product.price)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="rounded p-1 text-ena-text-muted hover:text-ena-text hover:bg-white/10 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm text-ena-text">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="rounded p-1 text-ena-text-muted hover:text-ena-text hover:bg-white/10 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-xs text-ena-text-muted hover:text-ena-primary transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-ena-border p-4 space-y-2 shrink-0 -mx-5">
            <div className="flex justify-between text-sm px-5">
              <span className="text-ena-text-muted">Ara Toplam</span>
              <span className="font-bold text-ena-text">{formatPrice(total)}</span>
            </div>
            <div className="px-5 space-y-2">
              <Link href="/checkout" onClick={onClose}>
                <Button className="w-full">
                  Sepeti Onayla
                </Button>
              </Link>
              <Link href="/cart" onClick={onClose}>
                <Button variant="outline" className="w-full">
                  Sepeti Görüntüle
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
