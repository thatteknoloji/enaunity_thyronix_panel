"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PartnerDealerShell, PartnerTypeBadge } from "@/components/partners/PartnerDealerShell";

export default function DealerPartnerCodesPage() {
  const [profile, setProfile] = useState<{ referralCode: string; referralSlug: string; referralLink?: string; status: string; partnerType: string } | null>(null);

  useEffect(() => {
    fetch("/api/dealer/partner")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.profile) {
          setProfile({ ...d.data.profile, referralLink: d.data.referralLink });
        }
      });
  }, []);

  if (!profile) {
    return (
      <PartnerDealerShell title="Referans Kodları">
        <p className="text-ena-light text-sm">Aktif partner profili bulunamadı. <a href="/dealer/partner/apply" className="text-cyan-400">Başvuru yapın</a></p>
      </PartnerDealerShell>
    );
  }

  return (
    <PartnerDealerShell title="Referans Kodları" description="Kodunuzu ve linkinizi paylaşın">
      <div className="rounded-xl border border-ena-border bg-ena-card p-5 space-y-4">
        <PartnerTypeBadge type={profile.partnerType} />
        <div>
          <p className="text-xs text-ena-light uppercase">Referans kodu</p>
          <p className="font-mono text-2xl text-cyan-400">{profile.referralCode}</p>
        </div>
        <div>
          <p className="text-xs text-ena-light uppercase">Referans linki</p>
          <p className="text-sm text-ena-light break-all">{profile.referralLink}</p>
        </div>
        <div>
          <p className="text-xs text-ena-light uppercase">Kısa link (slug)</p>
          <p className="font-mono text-sm text-white">/r/{profile.referralSlug}</p>
        </div>
        <div className="rounded-lg border border-dashed border-ena-border p-6 text-center text-xs text-ena-light/60">
          QR kod — yakında eklenecek
        </div>
        <button
          type="button"
          onClick={() => {
            if (profile.referralLink) {
              navigator.clipboard.writeText(profile.referralLink);
              toast.success("Kopyalandı");
            }
          }}
          className="rounded-lg bg-cyan-600/20 border border-cyan-500/30 px-4 py-2 text-sm text-cyan-300"
        >
          Linki kopyala
        </button>
      </div>
    </PartnerDealerShell>
  );
}
