import Link from "next/link";
import { PartnerDealerShell } from "@/components/partners/PartnerDealerShell";

export default function DealerPartnerMaterialsPage() {
  return (
    <PartnerDealerShell title="Partner Materyalleri" description="Paylaşım için hazır içerikler">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "EnaUnity Tanıtım", desc: "Genel B2B bayi tanıtım metni" },
          { title: "LinkSlash", desc: "Modül tanıtım görselleri — yakında" },
          { title: "Thyronix", desc: "Feed yönetimi tanıtımı — yakında" },
          { title: "HIVE", desc: "SEO/GEO tanıtımı — yakında" },
        ].map((m) => (
          <div key={m.title} className="rounded-xl border border-ena-border bg-ena-card p-5">
            <h3 className="font-semibold text-white mb-1">{m.title}</h3>
            <p className="text-sm text-ena-light">{m.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ena-light">
        Referans linkiniz: <Link href="/dealer/partner/codes" className="text-cyan-400 hover:underline">Referans Kodları</Link> sayfasından alın.
      </p>
    </PartnerDealerShell>
  );
}
