import Link from "next/link";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

export default function AdminPodPage() {
  return (
    <PartnerAdminShell title="POD Merkezi" description="Print-on-Demand — Faz 0 altyapı">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/admin/pod/templates", label: "Şablonlar" },
          { href: "/admin/pod/designs", label: "Tasarımlar" },
          { href: "/admin/pod/orders", label: "Siparişler" },
        ].map((l) => (
          <Link key={l.href} href={toAdminUrl(l.href)} className="rounded-xl border bg-white p-6 text-center font-semibold hover:bg-gray-50">
            {l.label}
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Editör entegrasyonu sonraki faz. Araştırma: <code className="text-xs bg-gray-100 px-1 rounded">docs/pod-github-research.md</code>
      </p>
    </PartnerAdminShell>
  );
}
