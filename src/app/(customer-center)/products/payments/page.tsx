"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/components/customer-products/ProductCard";

type Payment = {
  id: string;
  moduleKey: string;
  moduleLabel: string;
  planKey: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
  createdAt: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer-products/payments")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.error?.includes("Oturum") || d.error?.includes("bayi")) {
            router.push("/login?redirect=/products/payments");
          }
          setLoading(false);
          return;
        }
        setPayments(d.data.payments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ena-primary" size={32} /></div>;
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ena-light border-b border-white/10 bg-ena-card/50">
            <th className="px-4 py-3 font-medium">Ürün</th>
            <th className="px-4 py-3 font-medium">Paket</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Durum</th>
            <th className="px-4 py-3 font-medium">Sağlayıcı</th>
            <th className="px-4 py-3 font-medium">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-ena-light">Ödeme kaydı yok</td></tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white">{p.moduleLabel}</td>
                <td className="px-4 py-3 text-ena-light">{p.planKey}</td>
                <td className="px-4 py-3 text-white">{p.amount.toLocaleString("tr-TR")} {p.currency}</td>
                <td className="px-4 py-3 text-ena-light">{p.status}</td>
                <td className="px-4 py-3 text-ena-light">{p.provider}</td>
                <td className="px-4 py-3 text-ena-light text-xs">{formatDate(p.paidAt || p.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
