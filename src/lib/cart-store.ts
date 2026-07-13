import { create } from "zustand";
import type { CartItem } from "@/types";

const LOCAL_KEY = "ena-cart";

function getLocalCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  mergeLocal: () => Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),

  fetchCart: async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || [];
        // Merge any local items that aren't already in the cart
        const localItems = getLocalCart();
        if (localItems.length > 0) {
          // Add local items to server cart
          for (const li of localItems) {
            const exists = items.find((i: CartItem) => i.productId === li.productId);
            if (!exists) {
              try {
                await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: li.productId, quantity: li.quantity }),
                });
              } catch { /* skip */ }
            }
          }
          localStorage.removeItem(LOCAL_KEY);
          // Refetch after merge
          const r2 = await fetch("/api/cart");
          if (r2.ok) {
            const d2 = await r2.json();
            set({ items: d2.data?.items || [] });
            return;
          }
        }
        set({ items });
        return;
      }
    } catch { /* fallback */ }
    // Not logged in — use localStorage
    set({ items: getLocalCart() });
  },

  addItem: async (productId, quantity = 1, variantId = "") => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, variantId }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ items: data.data?.items || [], isOpen: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.code === "VARIANT_REQUIRED" || res.status === 400) {
        throw new Error(data?.error || "Varyant seçimi zorunludur");
      }
    } catch (error) {
      if (error instanceof Error && /varyant/i.test(error.message)) {
        throw error;
      }
      /* fallback for offline/local */
    }

    // Local fallback: add to localStorage
    const local = getLocalCart();
    const existing = local.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      // Fetch product info for local cart
      try {
        const pr = await fetch(`/api/products/${productId}`);
        if (pr.ok) {
          const pd = await pr.json();
          if (pd.data) {
            local.push({
              id: `local-${Date.now()}`,
              productId,
              quantity,
              product: { id: productId, name: pd.data.name, price: pd.data.price, image: pd.data.image, description: "", images: "[]", category: pd.data.category || "", subcategory: "", stock: pd.data.stock || 0, minOrderQuantity: 1, createdAt: "" },
            } as CartItem);
          }
        }
      } catch {
        // Can't get product info, skip
      }
    }
    setLocalCart(local);
    set({ items: local, isOpen: true });
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ items: data.data?.items || [] });
        return;
      }
    } catch { /* fallback */ }

    // Local fallback
    const local = getLocalCart();
    const item = local.find((i) => i.id === itemId);
    if (item) {
      if (quantity <= 0) {
        setLocalCart(local.filter((i) => i.id !== itemId));
      } else {
        item.quantity = quantity;
        setLocalCart(local);
      }
    }
    set({ items: getLocalCart() });
  },

  removeItem: async (itemId) => {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ items: data.data?.items || [] });
        return;
      }
    } catch { /* fallback */ }

    // Local fallback
    const local = getLocalCart().filter((i) => i.id !== itemId);
    setLocalCart(local);
    set({ items: local });
  },

  clearCart: () => {
    set({ items: [] });
    setLocalCart([]);
  },

  mergeLocal: async () => {
    const local = getLocalCart();
    if (local.length === 0) return;
    for (const item of local) {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
        });
      } catch { /* skip */ }
    }
    localStorage.removeItem(LOCAL_KEY);
    await get().fetchCart();
  },
}));
