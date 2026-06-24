"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package, LogOut, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { getNavPermissionMap, hasAnyPermission } from "@/lib/permissions";
import { getAdminLoginPath, isAdminLoginPath, isAdminRole, isSuperAdmin, toAdminUrl } from "@/lib/auth/admin-access";
import { isLegacyMarketplaceEnabledClient } from "@/lib/marketplace-hub/config";
import { buildAdminNavGroups, navItemPath, resolveActiveNavItemHref } from "@/lib/admin/admin-nav";
import NotificationBell from "@/components/NotificationBell";
import { useT } from "@/lib/i18n/provider";

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
  const [userRole, setUserRole] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [lowStockCount, setLowStockCount] = useState(0);

  const permMap = useMemo(() => getNavPermissionMap(), []);
  const isLoginPage = isAdminLoginPath(pathname);

  const navGroups = useMemo(() => {
    const allNavGroups = buildAdminNavGroups(t, isLegacyMarketplaceEnabledClient());
    const fullAccess = isSuperAdmin(userRole) || userPermissions.length === 0 || userPermissions.includes("*");
    return allNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (fullAccess) return true;
          const perms = permMap[navItemPath(item.href)];
          if (!perms || perms.length === 0) return false;
          return hasAnyPermission(userPermissions, ...perms);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [userPermissions, userRole, permMap, t]);

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
          setUserRole(d.data.role || "");
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
      const hasActive = !!resolveActiveNavItemHref(pathname, g.items, toAdminUrl);
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
          const activeHref = resolveActiveNavItemHref(pathname, group.items, toAdminUrl);
          const hasActive = !!activeHref;

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
                    const itemUrl = item.href.includes("?")
                      ? `${toAdminUrl(navItemPath(item.href))}?${item.href.split("?")[1]}`
                      : toAdminUrl(item.href);
                    const isActive = activeHref === item.href;
                    return (
                      <Link key={`${group.label}-${item.label}`} href={itemUrl} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive ? "bg-ena-primary/10 text-ena-primary border border-ena-primary/20" : "text-ena-light hover:text-white hover:bg-white/5"
                        }`}
                        title={collapsed ? item.label : undefined}>
                        <item.icon size={collapsed ? 18 : 16} className="shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {"badge" in item && item.badge ? (
                              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        )}
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
