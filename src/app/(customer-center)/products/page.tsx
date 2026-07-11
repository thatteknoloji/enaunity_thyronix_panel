"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CustomerProductCardView } from "@/components/customer-products/ProductCard";
import type { CustomerProductsOverview } from "@/lib/customer-products/types";

export default function CustomerProductsPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerProductsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customer-products")
      .then((r) => r.json())
      .then((d) => {
        if (d.code === "AUTH_REQUIRED") {
          router.push("/login?redirect=/products");
          return;
        }
        if (d.success) setData(d.data);
        else setError(d.error || "Veri yüklenemedi");
        setLoading(false);
      })
      .catch(() => {
        setError("Bağlantı hatası");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {data?.dealerName && (
        <p className="text-sm text-ena-light">
          <span className="text-white font-medium">{data.dealerName}</span> — lisanslı ürünleriniz
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.products.map((product) => (
          <CustomerProductCardView key={product.moduleKey} product={product} />
        ))}
      </div>
    </div>
  );
}
