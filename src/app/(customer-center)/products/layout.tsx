"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, CreditCard, FileText, LifeBuoy, Shield } from "lucide-react";

const NAV = [
  { href: "/products", label: "Ürünlerim", icon: Package },
  { href: "/products/licenses", label: "Lisanslar", icon: Shield },
  { href: "/products/payments", label: "Ödemeler", icon: CreditCard },
  { href: "/products/invoices", label: "Faturalar", icon: FileText },
  { href: "/products/support", label: "Destek", icon: LifeBuoy },
];

export default function CustomerProductsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-viewport min-h-screen w-full bg-ena-dark">
      <div className="border-b border-white/10 bg-ena-card/40">
        <div className="mx-auto max-w-6xl min-w-0 px-4 py-6">
          <h1 className="text-2xl font-bold text-white">Müşteri Merkezi</h1>
          <p className="text-sm text-ena-light mt-1">Tüm ENA ürünlerinizi tek yerden yönetin</p>
        </div>
        <div className="mx-auto flex max-w-6xl min-w-0 gap-1 overflow-x-auto overscroll-x-contain px-4 pb-0 scrollbar-none">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-ena-primary text-ena-primary"
                    : "border-transparent text-ena-light hover:text-white"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mx-auto max-w-6xl min-w-0 px-4 py-8">{children}</div>
    </div>
  );
}
