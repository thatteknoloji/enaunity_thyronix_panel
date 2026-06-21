"use client";

import { useEffect, useState } from "react";
import { PartnerDealerShell } from "@/components/partners/PartnerDealerShell";

export default function DealerPartnerNetworkPage() {
  const [rows, setRows] = useState<Array<{ id: string; referralCode: string; partnerType: string; status: string; createdAt: string; _count?: { referrals: number } }>>([]);
  const [referrals, setReferrals] = useState<Array<{ id: string; status: string; landingPath: string | null; createdAt: string }>>([]);

  useEffect(() => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => {
      if (d.success) {
        setRows(d.data.network || []);
        setReferrals(d.data.referrals || []);
      }
    });
  }, []);

  return (
    <PartnerDealerShell title="Referans Ağı" description="Getirdiğiniz bayi/partnerler ve referans hareketleri">
      <h3 className="text-sm font-semibold text-white mb-2">Sponsor olduğunuz partnerler ({rows.length})</h3>
      <ul className="space-y-2 mb-6">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-ena-border bg-ena-card px-4 py-3 text-sm flex justify-between">
            <span className="font-mono text-cyan-400/80">{r.referralCode}</span>
            <span className="text-ena-light">{r.status}</span>
          </li>
        ))}
        {!rows.length && <li className="text-ena-light text-sm">Henüz ağınıza kayıtlı partner yok</li>}
      </ul>
      <h3 className="text-sm font-semibold text-white mb-2">Referans hareketleri</h3>
      <ul className="space-y-2">
        {referrals.map((r) => (
          <li key={r.id} className="rounded-lg border border-ena-border bg-ena-card px-4 py-3 text-sm flex justify-between">
            <span>{r.status} · {r.landingPath || "/"}</span>
            <span className="text-ena-light text-xs">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
          </li>
        ))}
        {!referrals.length && <li className="text-ena-light text-sm">Henüz referans kaydı yok</li>}
      </ul>
    </PartnerDealerShell>
  );
}
