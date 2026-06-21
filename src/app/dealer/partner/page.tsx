"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  PartnerDealerShell,
  PartnerTypeBadge,
  StatCard,
  PodCreatorCard,
  AiPartnerModulesCard,
} from "@/components/partners/PartnerDealerShell";

type Data = {
  profile?: { referralCode: string; status: string; partnerType: string; normalizedType?: string; partnerTypeLabel?: string } | null;
  referralLink?: string;
  stats?: {
    visits: number;
    registrations: number;
    networkCount: number;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    totalEarned: number;
  };
  referrals?: Array<{ id: string; status: string; landingPath: string | null; createdAt: string }>;
  canApply?: boolean;
};

export default function DealerPartnerPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); });
  }, []);

  if (data?.canApply && !data.profile) {
    return (
      <PartnerDealerShell title="Partner Merkezi" description="EnaUnity Bayi Ağı — referans ve komisyon">
        <p className="text-ena-light text-sm mb-4">Henüz partner profiliniz yok. Başvuru yaparak referans kodunuzu alabilirsiniz.</p>
        <Link href="/dealer/partner/apply" className="inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
          Partner Başvurusu Yap
        </Link>
      </PartnerDealerShell>
    );
  }

  const p = data?.profile;
  const s = data?.stats;
  const type = p?.normalizedType || p?.partnerType;

  return (
    <PartnerDealerShell title="Partner Merkezi" description="Referans kodunuz, kazanç özeti ve ağınız">
      {p?.status === "PENDING" && (
        <p className="text-amber-400 text-sm mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          Başvurunuz admin onayı bekliyor.
        </p>
      )}
      {p && p.status === "ACTIVE" && (
        <div className="rounded-xl border border-ena-border bg-ena-card p-5 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PartnerTypeBadge type={type || ""} />
            <span className="text-xs text-ena-light">{p.partnerTypeLabel}</span>
          </div>
          <p className="text-xs text-ena-light uppercase mb-1">Referans kodu</p>
          <p className="font-mono text-cyan-400 text-lg">{p.referralCode}</p>
          <p className="mt-3 text-sm text-ena-light break-all">{data?.referralLink}</p>
          <div className="mt-4 rounded-lg border border-dashed border-ena-border p-4 text-center text-xs text-ena-light/60">
            QR kod alanı — yakında
          </div>
          <button
            type="button"
            className="mt-3 text-xs text-cyan-400 hover:underline"
            onClick={() => {
              if (data?.referralLink) {
                navigator.clipboard.writeText(data.referralLink);
                toast.success("Referans linki kopyalandı");
              }
            }}
          >
            Linki kopyala
          </button>
        </div>
      )}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <StatCard label="Referans ziyareti" value={s.visits} />
          <StatCard label="Kayıt" value={s.registrations} />
          <StatCard label="Referans ağı" value={s.networkCount} />
          <StatCard label="Bekleyen" value={`${s.pendingCommission.toFixed(2)} ₺`} accent="text-cyan-400" />
          <StatCard label="Onaylı" value={`${s.approvedCommission.toFixed(2)} ₺`} />
          <StatCard label="Ödenen" value={`${s.paidCommission.toFixed(2)} ₺`} accent="text-green-400" />
        </div>
      )}
      {type === "POD_CREATOR" && <div className="mb-4"><PodCreatorCard /></div>}
      {type === "AI_PARTNER" && <div className="mb-4"><AiPartnerModulesCard /></div>}
      {data?.referrals && data.referrals.length > 0 && (
        <div className="rounded-xl border border-ena-border bg-ena-card p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Son referans hareketleri</h3>
          <ul className="space-y-1 text-sm text-ena-light">
            {data.referrals.slice(0, 5).map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.status} · {r.landingPath || "/"}</span>
                <span className="text-xs">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PartnerDealerShell>
  );
}
