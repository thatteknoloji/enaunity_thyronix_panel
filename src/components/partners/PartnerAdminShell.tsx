"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

const ADMIN_NAV = [
  { href: "/admin/partners", label: "Partnerler" },
  { href: "/admin/partners/applications", label: "Başvurular" },
  { href: "/admin/partners/network", label: "Referans Ağı" },
  { href: "/admin/partners/commissions", label: "Komisyonlar" },
  { href: "/admin/partners/payouts", label: "Ödemeler" },
];

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  children?: React.ReactNode;
};

export function PartnerAdminShell({ title, description, backHref = "/admin/partners", children }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href={toAdminUrl(backHref)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 mb-6">
        {ADMIN_NAV.map((l) => (
          <Link
            key={l.href}
            href={toAdminUrl(l.href)}
            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children || (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Modül altyapısı hazır.
        </div>
      )}
    </div>
  );
}
