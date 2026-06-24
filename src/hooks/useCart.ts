"use client";

import { useState, useEffect, useCallback } from "react";

export type CartItem = {
  storeProductId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

const CART_KEY = "ena_dropship_cart";
const STORE_KEY = "ena_dropship_store";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart(slug: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveCart(items);
  }, [items, mounted]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.storeProductId === item.storeProductId);
      if (existing) {
        return prev.map((i) =>
          i.storeProductId === item.storeProductId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((storeProductId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.storeProductId !== storeProductId)
        : prev.map((i) => (i.storeProductId === storeProductId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((storeProductId: string) => {
    setItems((prev) => prev.filter((i) => i.storeProductId !== storeProductId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(STORE_KEY);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, updateQuantity, removeItem, clearCart, total, count, mounted };
}
