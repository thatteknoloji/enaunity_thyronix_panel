"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ExternalLink } from "lucide-react";
import { formatDate } from "@/components/customer-products/ProductCard";

type Invoice = {
  id: string;
  moduleKey: string;
  moduleLabel: string;
  planKey: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string;
  paidAt: string | null;
  createdAt: string;
};

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleFilter = searchParams.get("module");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer-products/invoices")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.error?.includes("Oturum") || d.error?.includes("bayi")) {
            router.push("/login?redirect=/products/invoices");
          }
          setLoading(false);
          return;
        }
        setInvoices(d.data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ena-primary" size={32} /></div>;
  }

  const filtered = moduleFilter ? invoices.filter((i) => i.moduleKey === moduleFilter) : invoices;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ena-light border-b border-white/10 bg-ena-card/50">
            <th className="px-4 py-3 font-medium">Ürün</th>
            <th className="px-4 py-3 font-medium">Paket</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Durum</th>
            <th className="px-4 py-3 font-medium">Ödeme Tarihi</th>
            <th className="px-4 py-3 font-medium">Fatura</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-ena-light">Fatura kaydı yok</td></tr>
          ) : (
            filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white">{inv.moduleLabel}</td>
                <td className="px-4 py-3 text-ena-light">{inv.planKey}</td>
                <td className="px-4 py-3 text-white">{inv.amount.toLocaleString("tr-TR")} {inv.currency}</td>
                <td className="px-4 py-3 text-ena-light">{inv.status}</td>
                <td className="px-4 py-3 text-ena-light text-xs">{formatDate(inv.paidAt || inv.createdAt)}</td>
                <td className="px-4 py-3">
                  {inv.invoiceUrl ? (
                    <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ena-primary hover:underline text-xs">
                      Görüntüle <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-ena-light text-xs">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-ena-primary" size={32} /></div>}>
      <InvoicesContent />
    </Suspense>
  );
}
