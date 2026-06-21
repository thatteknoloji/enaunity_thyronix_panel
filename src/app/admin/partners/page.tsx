"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Row = {
  id: string;
  partnerType: string;
  partnerTypeLabel: string;
  normalizedType: string;
  referralCode: string;
  status: string;
  moduleCommissionRate: number;
  networkOverrideRate: number;
  stats?: { pendingCommission: number; networkCount: number };
};

const TYPE_LABELS: Record<string, string> = {
  PROFESSIONAL_DEALER: "Profesyonel Bayi",
  SOCIAL_DEALER: "Sosyal Bayi",
  POD_CREATOR: "POD Creator",
  AI_PARTNER: "AI Partner",
};

const TYPES = ["PROFESSIONAL_DEALER", "SOCIAL_DEALER", "POD_CREATOR", "AI_PARTNER"] as const;

export default function AdminPartnersPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    fetch("/api/admin/partners").then((r) => r.json()).then((d) => { if (d.success) setRows(d.data); });
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
    <PartnerAdminShell title="Partner Ecosystem" description="Bayi ağı — partner tipleri, oranlar, durum">
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Tip</th>
              <th className="px-4 py-2 text-left">Kod</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Ağ</th>
              <th className="px-4 py-2 text-left">Bekleyen ₺</th>
              <th className="px-4 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">
                  <select
                    className="text-xs border rounded px-1 py-0.5"
                    value={r.normalizedType || r.partnerType}
                    onChange={(e) => patch(r.id, { action: "change_type", partnerType: e.target.value })}
                  >
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.referralCode}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.stats?.networkCount ?? 0}</td>
                <td className="px-4 py-2">{(r.stats?.pendingCommission || 0).toFixed(2)}</td>
                <td className="px-4 py-2 space-x-1 text-xs">
                  <Link href={toAdminUrl(`/admin/partners/${r.id}`)} className="text-violet-600 hover:underline">Detay</Link>
                  {r.status === "PENDING" && <button type="button" onClick={() => patch(r.id, { action: "approve" })} className="text-green-600 hover:underline">Onayla</button>}
                  {r.status === "ACTIVE" && <button type="button" onClick={() => patch(r.id, { action: "suspend" })} className="text-amber-600 hover:underline">Pasif</button>}
                  <button type="button" onClick={() => patch(r.id, { action: "refresh_code" })} className="text-blue-600 hover:underline">Kod yenile</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Partner profili yok</td></tr>}
          </tbody>
        </table>
      </div>
    </PartnerAdminShell>
  );
}
