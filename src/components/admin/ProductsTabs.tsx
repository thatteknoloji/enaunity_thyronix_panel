"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toAdminUrl } from "@/lib/auth/admin-access";

const TABS = [
  { key: "list", label: "Liste", href: "/admin/products" },
  { key: "import", label: "Toplu Yükle", href: "/admin/products/import" },
  { key: "history", label: "Import Geçmişi", href: "/admin/products/import/history" },
];

export function ProductsTabs() {
  const pathname = usePathname();

  const active = pathname?.includes("/import/history")
    ? "history"
    : pathname?.includes("/import")
      ? "import"
      : "list";

  return (
    <div className="flex gap-1 mb-4 border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={toAdminUrl(tab.href)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.key
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
