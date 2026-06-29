"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toAdminUrl } from "@/lib/auth/admin-access";

const TABS = [
  { key: "list", label: "Liste", href: "/admin/products" },
  { key: "new", label: "Yeni Ürün", href: "/admin/products/new" },
  { key: "import", label: "Toplu Yükle", href: "/admin/products/import" },
  { key: "history", label: "Import Geçmişi", href: "/admin/products/import/history" },
];

export function ProductsTabs() {
  const pathname = usePathname();

  const active = pathname?.includes("/import/history")
    ? "history"
    : pathname?.includes("/import")
      ? "import"
      : pathname?.endsWith("/products/new") || /\/products\/[^/]+$/.test(pathname || "")
        ? "new"
        : "list";

  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={toAdminUrl(tab.href)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
