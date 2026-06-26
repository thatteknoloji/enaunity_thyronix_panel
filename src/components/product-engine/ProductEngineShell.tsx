"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { ProductEngineDto } from "@/lib/product-engine/types";
import { ProductEngineFiltersBar, type ProductEngineFiltersState } from "./ProductEngineFiltersBar";
import { ProductEngineCardGrid } from "./ProductEngineCard";
import { ProductEngineDetailPanel } from "./ProductEngineDetailPanel";

const EMPTY_FILTERS: ProductEngineFiltersState = {
  category: "",
  productType: "",
  active: "",
  pod: "",
  dropship: "",
  production: "",
  search: "",
};

export function ProductEngineShell() {
  const [products, setProducts] = useState<ProductEngineDto[]>([]);
  const [allProducts, setAllProducts] = useState<ProductEngineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductEngineFiltersState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<ProductEngineDto | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams({ engine: "1" });
    if (filters.category) p.set("category", filters.category);
    if (filters.productType) p.set("productType", filters.productType);
    if (filters.active) p.set("active", filters.active);
    if (filters.pod) p.set("pod", filters.pod);
    if (filters.dropship) p.set("dropship", filters.dropship);
    if (filters.production) p.set("production", filters.production);
    if (filters.search) p.set("search", filters.search);
    return p.toString();
  }, [filters]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?${query}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setProducts(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/products?engine=1")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAllProducts(json.data ?? []);
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(
    () => [...new Set(allProducts.map((p) => p.identity.category).filter(Boolean))].sort(),
    [allProducts]
  );
  const productTypes = useMemo(
    () => [...new Set(allProducts.map((p) => p.identity.productType).filter(Boolean))].sort(),
    [allProducts]
  );

  const handleCreate = async () => {
    const name = prompt("Özel profil adı:");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/products?engine=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: true,
          identity: { name: name.trim(), category: "Özel" },
          flags: { active: true, pod: false, dropship: false, production: true },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Özel profil oluşturuldu");
      await fetchProducts();
      setSelected(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Oluşturulamadı");
    }
  };

  const handleUpdated = (p: ProductEngineDto) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    setSelected(p);
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <ProductEngineFiltersBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onRefresh={fetchProducts}
        onCreate={handleCreate}
        loading={loading}
        categories={categories}
        productTypes={productTypes}
        total={products.length}
      />
      <ProductEngineCardGrid products={products} onSelect={setSelected} loading={loading} />
      <ProductEngineDetailPanel
        product={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
