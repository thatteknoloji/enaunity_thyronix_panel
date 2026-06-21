"use client";

import { useEffect, useState } from "react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

export default function AdminPartnersPayoutsPage() {
  const [rows, setRows] = useState<Array<{ id: string; amount: number; status: string }>>([]);
  useEffect(() => {
    fetch("/api/admin/partners/payouts").then((r) => r.json()).then((d) => { if (d.success) setRows(d.data); });
  }, []);

  return (
    <PartnerAdminShell title="Affiliate Ödemeleri" description="Partner komisyon ödeme kayıtları">
      <table className="w-full text-sm rounded-xl border bg-white overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr><th className="px-4 py-2 text-left">Tutar</th><th className="px-4 py-2 text-left">Durum</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}><td className="px-4 py-2">{r.amount.toFixed(2)} ₺</td><td className="px-4 py-2">{r.status}</td></tr>
          ))}
          {!rows.length && <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">Ödeme kaydı yok</td></tr>}
        </tbody>
      </table>
    </PartnerAdminShell>
  );
}
