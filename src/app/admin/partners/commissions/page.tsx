"use client";

import { useEffect, useState } from "react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

export default function AdminPartnersCommissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; amount: number; status: string; commissionType: string; orderId: string | null }>>([]);

  const load = () => {
    fetch("/api/admin/partners/commissions").then((r) => r.json()).then((d) => { if (d.success) setRows(d.data); });
  };

  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/partners/commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <PartnerAdminShell title="Affiliate Komisyonları" description="PENDING → APPROVED → PAID">
      <table className="w-full text-sm rounded-xl border bg-white overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr><th className="px-4 py-2 text-left">Tip</th><th className="px-4 py-2 text-left">Tutar</th><th className="px-4 py-2 text-left">Durum</th><th className="px-4 py-2 text-left">İşlem</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2">{r.commissionType}</td>
              <td className="px-4 py-2">{r.amount.toFixed(2)} ₺</td>
              <td className="px-4 py-2">{r.status}</td>
              <td className="px-4 py-2 space-x-2 text-xs">
                {r.status === "PENDING" && <button type="button" onClick={() => setStatus(r.id, "APPROVED")} className="text-green-600">Onayla</button>}
                {r.status === "APPROVED" && <button type="button" onClick={() => setStatus(r.id, "PAID")} className="text-blue-600">Ödendi</button>}
                {r.status === "PENDING" && <button type="button" onClick={() => setStatus(r.id, "REJECTED")} className="text-red-600">Reddet</button>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Komisyon kaydı yok</td></tr>}
        </tbody>
      </table>
    </PartnerAdminShell>
  );
}
