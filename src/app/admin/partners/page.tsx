"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Row = {
  id: string;
  partnerType: string;
  partnerTypeLabel: string;
  referralCode: string;
  status: string;
  commissionRate: number;
  recurringCommissionRate: number;
  stats?: { pendingCommission: number; paidCommission: number };
};

export default function AdminPartnersPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((d) => { if (d.success) setRows(d.data); });
  };

  useEffect(load, []);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  return (
    <PartnerAdminShell title="Partner Ecosystem" description="Partner profilleri, oranlar ve durum">
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { href: "/admin/partners/affiliates", label: "Affiliate" },
          { href: "/admin/partners/commissions", label: "Komisyonlar" },
          { href: "/admin/partners/payouts", label: "Ödemeler" },
        ].map((l) => (
          <Link key={l.href} href={toAdminUrl(l.href)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Tip</th>
              <th className="px-4 py-2 text-left">Kod</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Oran %</th>
              <th className="px-4 py-2 text-left">Bekleyen ₺</th>
              <th className="px-4 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.partnerTypeLabel || r.partnerType}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.referralCode}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.commissionRate} / {r.recurringCommissionRate}</td>
                <td className="px-4 py-2">{(r.stats?.pendingCommission || 0).toFixed(2)}</td>
                <td className="px-4 py-2 space-x-1">
                  {r.status === "PENDING" && (
                    <button type="button" onClick={() => patch(r.id, { action: "approve" })} className="text-xs text-green-600 hover:underline">Onayla</button>
                  )}
                  {r.status === "ACTIVE" && (
                    <button type="button" onClick={() => patch(r.id, { status: "SUSPENDED" })} className="text-xs text-amber-600 hover:underline">Askıya al</button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Henüz partner profili yok</td></tr>}
          </tbody>
        </table>
      </div>
    </PartnerAdminShell>
  );
}
