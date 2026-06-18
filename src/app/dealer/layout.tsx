"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingCart, User, LogOut, ChevronLeft, ChevronRight, Home, Store, Wallet, FileText, Users, RotateCcw, Bell, ReceiptText, Menu, X, Heart, Zap, MapPin, Upload, FileSignature, Library, Truck, Plug } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useT } from "@/lib/i18n/provider";

function buildNavItems(t: (key: string) => string) {
  return [
  { href: "/dealer", label: t("dealer.overview"), icon: LayoutDashboard },
  { href: "/dealer/orders", label: "Siparişlerim", icon: ShoppingCart },
  { href: "/dealer/quick-order", label: t("dealer.quick_order"), icon: Zap },
  { href: "/dealer/returns", label: t("dealer.returns"), icon: RotateCcw },
  { href: "/dealer/quotes", label: t("dealer.my_quotes"), icon: FileText },
  { href: "/dealer/balance", label: "Bakiye / Cari Hesap", icon: Wallet },
  { href: "/products", label: "Ürünlerim", icon: Store },
  { href: "/dealer/product-library", label: "Hazır Ürünler", icon: Library },
  { href: "/dealer/fulfillment/orders", label: "Siparişlerim", icon: ShoppingCart },
  { href: "/dealer/fulfillment/shipments", label: "Kargolarım", icon: Truck },
  { href: "/dealer/fulfillment/statements", label: "Ekstrelerim", icon: ReceiptText },
  { href: "/dealer/marketplace/connections", label: "Pazaryeri Bağlantıları", icon: Plug },
  { href: "/dealer/marketplace/orders", label: "Pazaryeri Siparişleri", icon: ShoppingCart },
  { href: "/account#contracts", label: "Sözleşmelerim", icon: FileSignature },
  { href: "/account#addresses", label: "Adreslerim", icon: MapPin },
  { href: "/account#documents", label: "Evraklarım", icon: Upload },
  { href: "/dealer/invoices", label: t("dealer.billing"), icon: ReceiptText },
  { href: "/dealer/saved-carts", label: t("dealer.saved_carts"), icon: ShoppingCart },
  { href: "/dealer/sub-users", label: t("dealer.sub_users"), icon: Users },
  { href: "/dealer/wishlist", label: t("dealer.wishlist"), icon: Heart },
  { href: "/dealer/profile", label: t("dealer.my_profile"), icon: User },
  { href: "/dealer/notifications", label: t("dealer.notifications"), icon: Bell },
];
}

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const [authorized, setAuthorized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dealerName, setDealerName] = useState("");

  const navItems = useMemo(() => buildNavItems(t), [t]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.data?.role !== "dealer") {
        router.push("/");
      } else {
        setAuthorized(true);
        setDealerName(d.data.name || t("dealer.dealer_label"));
      }
    });
  }, [router, t]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  };

  if (!authorized) return null;

  const sidebar = (
    <>
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
        {!collapsed ? (
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{color:"#e50914"}}>ENA</span>
            <span className="text-lg font-light text-white">{t("dealer.dealer_label")}</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <span className="text-lg font-black text-ena-primary">E</span>
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-ena-primary/10 text-ena-primary border border-ena-primary/20"
                  : "text-ena-light hover:text-white hover:bg-white/5"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 px-2 pb-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ena-light hover:text-white hover:bg-white/5 transition-colors"
        >
          <Home size={18} className="shrink-0" />
          {!collapsed && <span>{t("common.home")}</span>}
        </Link>
        <Link
          href="/catalog"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ena-light hover:text-white hover:bg-white/5 transition-colors"
        >
          <Store size={18} className="shrink-0" />
          {!collapsed && <span>{t("dealer.catalog")}</span>}
        </Link>
      </div>

      <div className="border-t border-white/10 px-2 py-3 shrink-0">
        {!collapsed && (
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-medium text-white truncate">{dealerName}</p>
            <p className="text-[10px] text-ena-light">{t("dealer.dealer_label")}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ena-light hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t("dealer.logout")}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-ena-dark">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-white/10 bg-ena-dark transition-all duration-300 relative ${collapsed ? "w-16" : "w-60"}`}>
        {sidebar}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ena-dark text-ena-light hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-ena-dark border-r border-white/10">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/10 bg-ena-dark/95 backdrop-blur shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-ena-light hover:text-white">
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{color:"#e50914"}}>ENA</span>
            <span className="text-lg font-light text-white">{t("dealer.dealer_label")}</span>
          </Link>
          <NotificationBell />
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-white/10 bg-ena-dark/95 backdrop-blur shrink-0">
          <NotificationBell />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark">
          {children}
        </div>
      </div>
    </div>
  );
}
