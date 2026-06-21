"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  ClipboardList, Store, DollarSign, Eye, Banknote, RotateCcw, Warehouse, FileText, Tag, Layers, Building2, Percent, Key, MessageSquare, ScrollText, Layout, PackagePlus, Truck, Shield, BarChart3, ClipboardCheck, Barcode, Bell, Megaphone, Webhook, Clock, CalendarClock, Upload, Link2, Plug, Zap, Sparkles, CreditCard, Globe, Smartphone, Handshake, Brain, Shirt
} from "lucide-react";
import { getNavPermissionMap, hasAnyPermission } from "@/lib/permissions";
import { getAdminLoginPath, isAdminLoginPath, isAdminRole, toAdminUrl } from "@/lib/auth/admin-access";
import { isLegacyMarketplaceEnabledClient } from "@/lib/marketplace-hub/config";
import NotificationBell from "@/components/NotificationBell";
import { useT } from "@/lib/i18n/provider";

function buildNavGroups(t: (key: string) => string) {
  const legacyMarketplaceEnabled = isLegacyMarketplaceEnabledClient();

  return [
    {
      label: "Genel Bakış",
      icon: LayoutDashboard,
      items: [
        { href: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard },
        { href: "/admin/reports", label: t("admin.reports"), icon: BarChart3 },
      ],
    },
    {
      label: "Site & İçerik",
      icon: Layout,
      items: [
        { href: "/admin/pages", label: t("admin.pages"), icon: FileText },
        { href: "/admin/site-settings", label: "Site Ayarları", icon: Globe },
        { href: "/admin/footer-settings", label: "Footer Ayarları", icon: Layout },
        { href: "/admin/footer-legal-strip", label: "Footer Hukuki Şerit", icon: Shield },
        { href: "/admin/homepage", label: "Ana Sayfa", icon: LayoutDashboard },
        { href: "/admin/ecosystem", label: "Ekosistem Vitrini", icon: Sparkles },
        { href: "/admin/contracts", label: t("admin.contracts"), icon: ScrollText },
        { href: "/admin/legal-audit", label: "Hukuki Denetim", icon: Shield },
      ],
    },
    {
      label: t("admin.product_management"),
      icon: Package,
      items: [
        { href: "/admin/products", label: t("admin.products"), icon: Package },
        { href: "/admin/categories", label: t("admin.categories"), icon: Layers },
        { href: "/admin/price-lists", label: t("admin.price_lists"), icon: DollarSign },
        { href: "/admin/tiered-prices", label: t("admin.tiered_prices"), icon: Layers },
        { href: "/admin/dealer-prices", label: t("admin.dealer_prices"), icon: Percent },
        { href: "/admin/catalog-restrictions", label: t("admin.catalog_restrictions"), icon: Eye },
        { href: "/admin/reviews", label: t("admin.reviews"), icon: MessageSquare },
        { href: "/admin/bundles", label: t("admin.bundles"), icon: PackagePlus },
        { href: "/admin/product-library", label: "Hazır Ürün Deposu", icon: Package },
      ],
    },
    {
      label: t("admin.dealer_management"),
      icon: Store,
      items: [
        { href: "/admin/dealers", label: t("admin.dealers"), icon: Store },
        { href: "/admin/members", label: "Üyeler", icon: Users },
        { href: "/admin/dealer-approvals", label: "Bayi Onayları", icon: ClipboardCheck },
        { href: "/admin/dealer-groups", label: t("admin.dealer_groups"), icon: Building2 },
        { href: "/admin/sales-rep", label: t("admin.sales_rep"), icon: Users },
        { href: "/admin/dealer-assignments", label: t("admin.assignment"), icon: Building2 },
        { href: "/admin/partner-applications", label: t("admin.applications"), icon: ClipboardList },
        { href: "/admin/api-keys", label: t("admin.api_keys"), icon: Key },
        { href: "/admin/dealer-documents", label: "Bayi Evrakları", icon: Upload },
      ],
    },
    {
      label: t("admin.orders_finance"),
      icon: ShoppingCart,
      items: [
        { href: "/admin/orders", label: t("admin.orders"), icon: ShoppingCart },
        { href: "/admin/backorders", label: t("admin.backorders"), icon: Clock },
        { href: "/admin/quotes", label: t("admin.quotes"), icon: FileText },
        { href: "/admin/coupons", label: t("admin.coupons"), icon: Tag },
        { href: "/admin/campaigns", label: t("admin.campaigns"), icon: Tag },
        { href: "/admin/returns", label: t("admin.returns"), icon: RotateCcw },
        { href: "/admin/payments", label: t("admin.payments"), icon: Banknote },
        { href: "/admin/payments/gateways", label: "Ödeme Altyapısı", icon: CreditCard },
        { href: "/admin/payments/policies", label: "Ödeme Politikaları", icon: CreditCard },
        { href: "/admin/payment-terms", label: t("admin.payment_terms"), icon: CalendarClock },
        { href: "/admin/dealer-transactions", label: "Bakiye Hareketleri", icon: DollarSign },
        { href: "/admin/invoices", label: "Faturalar", icon: FileText },
      ],
    },
    {
      label: t("admin.stock_warehouse"),
      icon: Warehouse,
      items: [
        { href: "/admin/stock-movements", label: t("admin.stock_movements"), icon: RotateCcw },
        { href: "/admin/stock-counts", label: t("admin.stock_counts"), icon: ClipboardCheck },
        { href: "/admin/stock/scan", label: t("admin.stock_scan"), icon: Barcode },
        { href: "/admin/warehouses", label: t("admin.warehouses"), icon: Warehouse },
        { href: "/admin/shipping", label: t("admin.shipping"), icon: Truck },
      ],
    },
    {
      label: "Partner Ecosystem",
      icon: Handshake,
      items: [
        { href: "/admin/partners", label: "Partner Ecosystem", icon: Handshake },
        { href: "/admin/partners/affiliates", label: "Affiliate Program", icon: Users },
        { href: "/admin/partners/commissions", label: "Komisyonlar", icon: DollarSign },
        { href: "/admin/partners/payouts", label: "Ödemeler", icon: Banknote },
        { href: "/admin/ai-partner", label: "AI Partner Merkezi", icon: Brain },
        { href: "/admin/pod", label: "POD Merkezi", icon: Shirt },
      ],
    },
    {
      label: "Premium Modüller",
      icon: Sparkles,
      items: [
        { href: "/admin/marketplace-hub", label: "Pazaryeri Merkezi", icon: Store },
        { href: "/admin/thyronix", label: "THYRONIX", icon: Zap },
        { href: "/admin/hive", label: "HIVE", icon: Sparkles },
        { href: "/admin/linkslash", label: "LinkSlash", icon: Link2 },
        { href: "/admin/linkslash/android", label: "LinkSlash Android", icon: Smartphone },
        { href: "/admin/linkslash/activation", label: "LinkSlash Aktivasyon", icon: Key },
        { href: "/admin/linkslash/analytics", label: "LinkSlash Analytics", icon: BarChart3 },
        { href: "/admin/linkslash/devices", label: "LinkSlash Cihazlar", icon: Smartphone },
        { href: "/admin/linkslash/release", label: "LinkSlash Release", icon: Link2 },
        { href: "/admin/product-links", label: "Ürün Bağlantıları", icon: Link2 },
        { href: "/admin/module-licenses", label: "Modül Lisansları", icon: Key },
        { href: "/admin/payments/module-payments", label: "Modül Ödemeleri", icon: CreditCard },
        { href: "/admin/integrations/thyronix", label: "THYRONIX Entegrasyon", icon: Plug },
        { href: "/admin/integrations/hive", label: "HIVE Entegrasyon", icon: Plug },
        { href: "/admin/customer-products", label: "Müşteri Ürünleri", icon: Package },
        ...(legacyMarketplaceEnabled
          ? [{ href: "/admin/marketplace", label: "Pazar Yeri (Legacy)", icon: Store }]
          : []),
      ],
    },
    {
      label: "Sistem & Kullanıcılar",
      icon: Shield,
      items: [
        { href: "/admin/users", label: t("admin.users"), icon: Users },
        { href: "/admin/roles", label: t("admin.roles"), icon: Shield },
        { href: "/admin/broadcasts", label: "Bildirim Yayınları", icon: Megaphone },
        { href: "/admin/notifications", label: t("admin.notifications"), icon: Bell },
        { href: "/admin/admin-logs", label: "Admin Logları", icon: ClipboardList },
        { href: "/admin/approval-rules", label: t("admin.approval_rules"), icon: ClipboardCheck },
        { href: "/admin/webhooks", label: t("admin.webhooks"), icon: Webhook },
      ],
    },
  ];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRoleLabel, setUserRoleLabel] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [lowStockCount, setLowStockCount] = useState(0);

  const permMap = useMemo(() => getNavPermissionMap(), []);
  const isLoginPage = isAdminLoginPath(pathname);

  const navGroups = useMemo(() => {
    const allNavGroups = buildNavGroups(t);
    const isSuperAdmin = userPermissions.length === 0 || userPermissions.includes("*");
    return allNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const perms = permMap[item.href];
          if (!perms || perms.length === 0) return isSuperAdmin;
          return hasAnyPermission(userPermissions, ...perms);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [userPermissions, permMap, t]);

  useEffect(() => {
    if (isLoginPage) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!isAdminRole(d.data?.role)) {
          router.push(d.data ? "/" : getAdminLoginPath());
        } else {
          setAuthorized(true);
          setUserName(d.data.name || "Admin");
          const roleName = d.data.adminRole?.name;
          setUserRoleLabel(roleName || t("admin.admin_label"));
          try {
            const perms = d.data.adminRole?.permissions ? JSON.parse(d.data.adminRole.permissions) : [];
            setUserPermissions(perms);
          } catch {
            setUserPermissions([]);
          }
        }
      })
      .catch(() => {
        setAuthError(true);
      });
  }, [router, t, isLoginPage]);

  // Fetch low stock count for sidebar badge
  useEffect(() => {
    fetch("/api/admin/products").then(r=>r.json()).then(d => {
      if (d.data) {
        setLowStockCount(d.data.filter((p:any) => p.minStockLevel > 0 && p.stock <= p.minStockLevel).length);
      }
    }).catch(() => {});
  }, []);

  // Auto-expand groups that contain the active route
  useEffect(() => {
    if (navGroups.length === 0) return;
    const active = new Set(expandedGroups);
    let changed = false;
    navGroups.forEach((g) => {
      const hasActive = g.items.some(
        (item) => {
          const url = toAdminUrl(item.href);
          return pathname === url || (item.href !== "/admin" && pathname.startsWith(url));
        }
      );
      if (hasActive && !active.has(g.label)) { active.add(g.label); changed = true; }
    });
    if (changed) setExpandedGroups(active);
  }, [pathname, navGroups]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  };

  if (isLoginPage) return <>{children}</>;

  if (authError) return (
    <div className="flex h-screen items-center justify-center bg-ena-dark">
      <div className="text-center space-y-4">
        <p className="text-ena-light">Sunucuya bağlanılamadı</p>
        <button
          onClick={() => { setAuthError(false); window.location.reload(); }}
          className="text-ena-primary hover:text-ena-primary text-sm font-medium transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );

  if (!authorized) return (
    <div className="flex h-screen items-center justify-center bg-ena-dark">
      <div className="animate-pulse space-y-4 text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-ena-gray" />
        <div className="h-4 w-32 rounded bg-ena-gray mx-auto" />
      </div>
    </div>
  );

  const sidebar = (
    <>
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
        {!collapsed ? (
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{color:"#e50914"}}>ENA</span>
            <span className="text-lg font-light text-white">ADMIN</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <span className="text-lg font-black text-ena-primary">E</span>
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-none">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label) || collapsed;
          const hasActive = group.items.some(
            (item) => {
          const url = toAdminUrl(item.href);
          return pathname === url || (item.href !== "/admin" && pathname.startsWith(url));
        }
          );

          return (
            <div key={group.label}>
              {!collapsed ? (
                <button onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    hasActive ? "text-ena-primary" : "text-ena-light/50 hover:text-ena-light"
                  }`}>
                  <group.icon size={15} className="shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  {group.label === t("admin.stock_warehouse") && lowStockCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-ena-primary/50 text-white text-[9px] font-bold leading-none">{lowStockCount}</span>
                  )}
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <div className="px-3 py-2 flex justify-center">
                  <group.icon size={16} className="text-ena-light/40 shrink-0" />
                </div>
              )}

              {(isExpanded || collapsed) && (
                <div className={!collapsed ? "ml-2 pl-3 border-l border-white/5 space-y-0.5" : "space-y-0.5"}>
                  {group.items.map((item) => {
                    const itemUrl = toAdminUrl(item.href);
                    const isActive = pathname === itemUrl || (item.href !== "/admin" && pathname.startsWith(itemUrl));
                    return (
                      <Link key={item.href} href={itemUrl} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive ? "bg-ena-primary/10 text-ena-primary border border-ena-primary/20" : "text-ena-light hover:text-white hover:bg-white/5"
                        }`}
                        title={collapsed ? item.label : undefined}>
                        <item.icon size={collapsed ? 18 : 16} className="shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-2 py-3 shrink-0">
        {!collapsed && (
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[10px] text-ena-light">{userRoleLabel}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ena-light hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t("admin.logout")}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="app-viewport flex h-screen max-w-[100dvw]">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-white/10 bg-ena-dark transition-all duration-300 relative ${collapsed ? "w-16" : "w-60"}`}>
        {sidebar}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ena-dark text-ena-light hover:text-white transition-colors">
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

      <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-gray-200 bg-white shrink-0 relative z-50">
          <button onClick={() => setMobileOpen(true)} className="mr-3 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <Package size={20} className="text-gray-700" />
          </button>
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{color:"#e50914"}}>ENA</span>
            <span className="text-lg font-light text-gray-700">ADMIN</span>
          </Link>
          <div className="ml-auto"><NotificationBell /></div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-200 bg-white/80 backdrop-blur shrink-0 gap-3 relative z-50">
          <span className="text-xs text-gray-400">{t("admin.admin_label")}</span>
          <NotificationBell />
        </div>

        <div className="admin-content app-main-scroll p-4 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
}
