"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, User, LogOut, ChevronLeft, ChevronRight, Home, Store, Wallet,
  FileText, Users, RotateCcw, Bell, ReceiptText, Menu, Upload, Heart, Zap, MapPin,
  FileSignature, Truck, Plug, Package, Handshake, Sparkles, LineChart, Shirt, Image, Layers, FolderKanban,
  type LucideIcon,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { LegalReacceptanceGate } from "@/components/legal/LegalReacceptanceGate";
import { useT } from "@/lib/i18n/provider";
import { buildLicensedNavItems } from "@/lib/modules/marketplace";
import { isAdminRole } from "@/lib/auth/admin-access";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

function buildStaticGroups(t: (key: string) => string): NavGroup[] {
  return [
    {
      label: "Genel",
      items: [
        { href: "/dealer", label: t("dealer.overview"), icon: LayoutDashboard },
        { href: "/dealer/analysis", label: "Analiz Merkezi", icon: LineChart },
        { href: "/dealer/notifications", label: t("dealer.notifications"), icon: Bell },
        { href: "/dealer/modules", label: "Modül Pazarı", icon: Sparkles },
      ],
    },
    {
      label: "Alışveriş",
      items: [
        { href: "/dealer/orders", label: "Siparişlerim", icon: ShoppingCart },
        { href: "/dealer/quick-order", label: t("dealer.quick_order"), icon: Zap },
        { href: "/dealer/returns", label: t("dealer.returns"), icon: RotateCcw },
        { href: "/dealer/quotes", label: t("dealer.my_quotes"), icon: FileText },
        { href: "/dealer/saved-carts", label: t("dealer.saved_carts"), icon: ShoppingCart },
        { href: "/dealer/wishlist", label: t("dealer.wishlist"), icon: Heart },
      ],
    },
    {
      label: "Finans",
      items: [
        { href: "/dealer/balance", label: "Bakiye / Cari Hesap", icon: Wallet },
        { href: "/dealer/invoices", label: t("dealer.billing"), icon: ReceiptText },
      ],
    },
    {
      label: "Operasyon",
      items: [
        { href: "/dealer/my-products", label: "Bayi Ürünlerim", icon: Package },
        { href: "/dealer/product-library", label: "Hazır Ürünler", icon: Package },
        { href: "/dealer/manual-order", label: "Manuel Sipariş", icon: Upload },
        { href: "/dealer/fulfillment/orders", label: "Fulfillment Siparişleri", icon: ShoppingCart },
        { href: "/dealer/fulfillment/shipments", label: "Kargolarım", icon: Truck },
        { href: "/dealer/fulfillment/statements", label: "Ekstrelerim", icon: ReceiptText },
      ],
    },
    {
      label: "Pazaryeri",
      items: [
        { href: "/dealer/marketplace/connections", label: "Pazaryeri Bağlantıları", icon: Plug },
        { href: "/dealer/marketplace/orders", label: "Pazaryeri Siparişleri", icon: ShoppingCart },
      ],
    },
    {
      label: "Partner",
      items: [{ href: "/dealer/partner", label: "Partner Merkezi", icon: Handshake }],
    },
    {
      label: "Hesabım",
      items: [
        { href: "/dealer/profile", label: t("dealer.my_profile"), icon: User },
        { href: "/dealer/sub-users", label: t("dealer.sub_users"), icon: Users },
        { href: "/account#contracts", label: "Sözleşmelerim", icon: FileSignature },
        { href: "/account#addresses", label: "Adreslerim", icon: MapPin },
        { href: "/account#documents", label: "Evraklarım", icon: Upload },
      ],
    },
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
  const [licensedItems, setLicensedItems] = useState<NavItem[]>([]);

  const navGroups = useMemo(() => {
    const staticGroups = buildStaticGroups(t);
    const groups: NavGroup[] = [...staticGroups.slice(0, 2)];
    if (licensedItems.length) {
      groups.push({
        label: "Modüllerim",
        items: [{ href: "/dealer/modules", label: "Modül Pazarı", icon: Sparkles }, ...licensedItems],
      });
    }
    groups.push(...staticGroups.slice(2));
    return groups;
  }, [t, licensedItems]);

  const isModuleShell =
    pathname.startsWith("/dealer/linkslash") ||
    pathname.startsWith("/dealer/pod") ||
    pathname.startsWith("/dealer/page-factory") ||
    pathname.startsWith("/dealer/product-universe") ||
    pathname.startsWith("/dealer/dropship");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (isAdminRole(d.data?.role)) {
          setAuthorized(true);
          setDealerName(d.data.name || "Admin");
          return;
        }
        if (d.data?.role !== "dealer") {
          router.push("/account");
        } else {
          setAuthorized(true);
          setDealerName(d.data.name || t("dealer.dealer_label"));
        }
      });
    fetch("/api/dealer/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const modules = d.data.modules || [];
          let navItems: NavItem[] = buildLicensedNavItems(modules).map(({ href, label, icon }) => ({
            href,
            label,
            icon,
          }));
          const podLicensed = modules.some(
            (m: { moduleKey: string; licensed?: boolean }) => m.moduleKey === "POD_CREATOR" && m.licensed
          );
          if (podLicensed) {
            const podExtras: NavItem[] = [
              { href: "/dealer/pod", label: "POD Creator", icon: Shirt },
              { href: "/dealer/pod/designs", label: "POD Tasarımlarım", icon: Image },
              { href: "/dealer/pod/templates", label: "POD Şablonları", icon: Layers },
              { href: "/dealer/pod/projects", label: "POD Projelerim", icon: FolderKanban },
            ];
            navItems = [...podExtras, ...navItems.filter((item) => item.label !== "POD Creator")];
          }
          if (
            modules.some(
              (m: { moduleKey: string; licensed?: boolean }) =>
                m.moduleKey === "AI_PAGE_FACTORY" && m.licensed
            )
          ) {
            navItems.push({
              href: "/dealer/product-universe",
              label: "Ürün Evreni",
              icon: Package,
            });
          }
          setLicensedItems(navItems);
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

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ena-dark">
        <div className="animate-pulse text-sm text-ena-light">Yükleniyor…</div>
      </div>
    );
  }

  if (
    pathname.startsWith("/dealer/linkslash") ||
    pathname.startsWith("/dealer/pod") ||
    pathname.startsWith("/dealer/page-factory") ||
    pathname.startsWith("/dealer/product-universe") ||
    pathname.startsWith("/dealer/dropship")
  ) {
    return <>{children}</>;
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href !== "/dealer" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-ena-primary/10 text-ena-primary border border-ena-primary/20"
            : "text-ena-light hover:text-white hover:bg-white/5"
        }`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon size={18} className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebar = (
    <>
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
        {!collapsed ? (
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{ color: "#e50914" }}>
              ENA
            </span>
            <span className="text-lg font-light text-white">{t("dealer.dealer_label")}</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <span className="text-lg font-black text-ena-primary">E</span>
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-none">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ena-light/50">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
          </div>
        ))}
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
    <div className="app-viewport flex h-screen max-w-[100dvw] bg-ena-dark">
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-white/10 bg-ena-dark transition-all duration-300 relative ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebar}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ena-dark text-ena-light hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-ena-dark border-r border-white/10">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/10 bg-ena-dark/95 backdrop-blur shrink-0 relative z-50">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-ena-light hover:text-white">
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{ color: "#e50914" }}>
              ENA
            </span>
            <span className="text-lg font-light text-white">{t("dealer.dealer_label")}</span>
          </Link>
          <NotificationBell />
        </div>

        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-white/10 bg-ena-dark/95 backdrop-blur shrink-0 relative z-50">
          <NotificationBell />
        </div>

        <div className="app-main-scroll p-4 md:p-8 bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark">
          <LegalReacceptanceGate scope="dealer">{children}</LegalReacceptanceGate>
        </div>
      </div>
    </div>
  );
}
