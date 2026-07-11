"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProductStatusBadge, STATUS_LABELS, formatDate } from "@/components/customer-products/ProductCard";
import type { CustomerProductCard } from "@/lib/customer-products/types";

function LicensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleFilter = searchParams.get("module");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<CustomerProductCard[]>([]);
  const [approval, setApproval] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch("/api/customer-products/licenses")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.error?.includes("Oturum")) router.push("/login?redirect=/products/licenses");
          return;
        }
        setProducts(d.data.products || []);
        setApproval(d.data.approval);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ena-primary" size={32} /></div>;
  }

  const filtered = moduleFilter ? products.filter((p) => p.moduleKey === moduleFilter) : products;

  return (
    <div className="space-y-6">
      {approval && (
        <div className="rounded-xl border border-white/10 bg-ena-card p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Bayi Onay Durumu</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-ena-light text-xs">Durum</dt><dd className="text-white">{approval.status}</dd></div>
            <div><dt className="text-ena-light text-xs">Evrak</dt><dd className="text-white">{approval.documentStatus}</dd></div>
            <div><dt className="text-ena-light text-xs">Ödeme</dt><dd className="text-white">{approval.paymentStatus}</dd></div>
            <div><dt className="text-ena-light text-xs">Firma</dt><dd className="text-white">{approval.companyName || "—"}</dd></div>
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ena-light border-b border-white/10 bg-ena-card/50">
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Paket</th>
              <th className="px-4 py-3 font-medium">Ham Durum</th>
              <th className="px-4 py-3 font-medium">Son Giriş</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.moduleKey} className="border-b border-white/5">
                <td className="px-4 py-3 text-white font-medium">{p.label}</td>
                <td className="px-4 py-3"><ProductStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-ena-light">{p.planName || "—"}</td>
                <td className="px-4 py-3 text-ena-light text-xs">{p.rawStatus}</td>
                <td className="px-4 py-3 text-ena-light text-xs">{formatDate(p.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ena-light/60">
        Durumlar: {Object.entries(STATUS_LABELS).map(([k, v]) => `${k}=${v}`).join(" · ")}
      </p>
    </div>
  );
}

export default function LicensesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-ena-primary" size={32} /></div>}>
      <LicensesContent />
    </Suspense>
  );
}
