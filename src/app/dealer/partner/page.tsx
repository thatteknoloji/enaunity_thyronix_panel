"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PartnerData = {
  profile?: { referralCode: string; referralSlug: string; status: string; commissionRate: number } | null;
  referralLink?: string;
  stats?: {
    visits: number;
    registrations: number;
    orders: number;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
  };
  canApply?: boolean;
  hybridNote?: string;
};

export default function DealerPartnerPage() {
  const [data, setData] = useState<PartnerData | null>(null);
  const [applying, setApplying] = useState(false);

  const load = () => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); });
  };

  useEffect(load, []);

  async function apply() {
    setApplying(true);
    await fetch("/api/dealer/partner", { method: "POST" });
    setApplying(false);
    load();
  }

  if (data?.canApply && !data.profile) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-4">Partner Merkezi</h1>
        <p className="text-ena-light text-sm mb-6">Affiliate programına katılarak referans linkinizle komisyon kazanın.</p>
        <button type="button" disabled={applying} onClick={apply} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Partner başvurusu yap
        </button>
      </div>
    );
  }

  const p = data?.profile;
  const s = data?.stats;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">Partner Merkezi</h1>
      <p className="text-ena-light text-sm mb-6">Durum: {p?.status || "—"}</p>
      {p?.status === "PENDING" && (
        <p className="text-amber-400 text-sm mb-4">Başvurunuz admin onayı bekliyor.</p>
      )}
      {p && p.status === "ACTIVE" && (
        <div className="rounded-xl border border-ena-border bg-ena-card p-5 mb-4">
          <p className="text-xs text-ena-light uppercase mb-1">Referans kodunuz</p>
          <p className="font-mono text-cyan-400 text-lg">{p.referralCode}</p>
          <p className="mt-3 text-sm text-ena-light break-all">{data?.referralLink}</p>
        </div>
      )}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Ziyaret</p><p className="text-white font-bold">{s.visits}</p></div>
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Kayıt</p><p className="text-white font-bold">{s.registrations}</p></div>
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Sipariş</p><p className="text-white font-bold">{s.orders}</p></div>
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Bekleyen</p><p className="text-cyan-400 font-bold">{s.pendingCommission.toFixed(2)} ₺</p></div>
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Onaylı</p><p className="text-white font-bold">{s.approvedCommission.toFixed(2)} ₺</p></div>
          <div className="rounded-lg border border-ena-border bg-ena-card p-3"><p className="text-ena-light text-xs">Ödenen</p><p className="text-green-400 font-bold">{s.paidCommission.toFixed(2)} ₺</p></div>
        </div>
      )}
      <p className="text-xs text-ena-light/60 mb-4">{data?.hybridNote}</p>
      <div className="flex gap-3">
        <Link href="/dealer/partner/referrals" className="rounded-lg bg-cyan-600/20 border border-cyan-500/30 px-4 py-2 text-sm text-cyan-300">Referanslar</Link>
        <Link href="/dealer/partner/commissions" className="rounded-lg border border-ena-border px-4 py-2 text-sm text-ena-light hover:text-white">Komisyonlar</Link>
      </div>
    </div>
  );
}
