"use client";

import { useEffect, useState } from "react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

export default function AdminPartnersNetworkPage() {
  const [links, setLinks] = useState<Array<{ id: string; referralCode: string; typeLabel: string; sponsor: { referralCode: string } | null }>>([]);
  const [sponsors, setSponsors] = useState<Array<{ referralCode: string; typeLabel: string; networkSize: number }>>([]);

  useEffect(() => {
    fetch("/api/admin/partners/network").then((r) => r.json()).then((d) => {
      if (d.success) {
        setLinks(d.data.networkLinks || []);
        setSponsors(d.data.topSponsors || []);
      }
    });
  }, []);

  return (
    <PartnerAdminShell title="Referans Ağı" description="Sponsor — alt partner ilişkileri (tek kat)">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">En aktif sponsorlar</h3>
      <ul className="grid sm:grid-cols-2 gap-2 mb-6">
        {sponsors.filter((s) => s.networkSize > 0).map((s) => (
          <li key={s.referralCode} className="rounded-lg border bg-white px-3 py-2 text-sm">
            <span className="font-mono">{s.referralCode}</span>
            <span className="text-gray-500 ml-2">· {s.networkSize} alt partner</span>
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Ağ bağlantıları</h3>
      <table className="w-full text-sm rounded-xl border bg-white overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr><th className="px-4 py-2 text-left">Partner</th><th className="px-4 py-2 text-left">Tip</th><th className="px-4 py-2 text-left">Sponsor</th></tr>
        </thead>
        <tbody className="divide-y">
          {links.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2 font-mono text-xs">{l.referralCode}</td>
              <td className="px-4 py-2">{l.typeLabel}</td>
              <td className="px-4 py-2 font-mono text-xs">{l.sponsor?.referralCode || "—"}</td>
            </tr>
          ))}
          {!links.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Ağ kaydı yok</td></tr>}
        </tbody>
      </table>
    </PartnerAdminShell>
  );
}
