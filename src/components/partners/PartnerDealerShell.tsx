"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const NAV = [
  { href: "/dealer/partner", label: "Özet" },
  { href: "/dealer/partner/codes", label: "Referans Kodları" },
  { href: "/dealer/partner/network", label: "Referans Ağı" },
  { href: "/dealer/partner/commissions", label: "Komisyonlar" },
  { href: "/dealer/partner/payouts", label: "Ödeme Talepleri" },
  { href: "/dealer/partner/materials", label: "Materyaller" },
];

export function PartnerDealerShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl">
      <Link href="/dealer" className="text-sm text-cyan-400 hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Bayi Paneli
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
      {description && <p className="text-ena-light text-sm mb-4">{description}</p>}
      <nav className="flex flex-wrap gap-2 mb-6">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              pathname === item.href
                ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-300"
                : "border-ena-border text-ena-light hover:text-white hover:border-ena-border/80"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function PartnerTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    PROFESSIONAL_DEALER: "Profesyonel Bayi",
    SOCIAL_DEALER: "Sosyal Bayi",
    POD_CREATOR: "POD Creator",
    AI_PARTNER: "AI Partner",
  };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
      {labels[type] || type}
    </span>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-ena-border bg-ena-card p-3">
      <p className="text-ena-light text-xs">{label}</p>
      <p className={`font-bold text-lg ${accent || "text-white"}`}>{value}</p>
    </div>
  );
}

export function PodCreatorCard() {
  return (
    <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-5">
      <h3 className="font-semibold text-violet-300 mb-1">POD Creator Alanı</h3>
      <p className="text-sm text-ena-light">Tasarım yükleme, ürün oluşturma ve satış takibi yakında aktif olacak.</p>
    </div>
  );
}

export function AiPartnerModulesCard() {
  const modules = [
    { name: "LinkSlash", path: "/platform/linkslash" },
    { name: "HIVE", path: "/platform/hive" },
    { name: "Thyronix", path: "/platform/thyronix" },
  ];
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <h3 className="font-semibold text-cyan-300 mb-2">Premium Modül Satışları</h3>
      <p className="text-sm text-ena-light mb-3">Referans linkinizle modül satışlarından komisyon kazanın.</p>
      <ul className="space-y-2">
        {modules.map((m) => (
          <li key={m.name}>
            <Link href={m.path} className="text-sm text-cyan-400 hover:underline">{m.name} → tanıtım sayfası</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
