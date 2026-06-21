"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight, Download, LogOut } from "lucide-react";
import { ACCOUNT_NAV, getPremiumModuleNavLinks, type AccountTab } from "./nav";
import { MARKETPLACE_MODULES, type MarketplaceModuleKey } from "@/lib/modules/marketplace";
import { getAdminSecretPath, isAdminRole, isSuperAdmin } from "@/lib/auth/admin-access";

type Props = {
  tab: AccountTab | "appearance";
  onTab: (tab: AccountTab) => void;
  activePath?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  logo?: string;
  onLogout: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
};

type LicensedLink = { href: string; label: string; icon: LucideIcon };

function NavLinkItem({
  href,
  label,
  icon: Ic,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
        active
          ? "bg-ena-primary/10 text-ena-primary font-semibold border border-ena-primary/20"
          : "text-ena-light hover:text-ena-text hover:bg-ena-primary/5 border border-transparent"
      }`}
    >
      <Ic size={16} className="shrink-0 opacity-70" />
      <span>{label}</span>
    </Link>
  );
}

export function AccountShell({ tab, onTab, activePath, userName, userEmail, userRole, logo, onLogout, children, headerActions }: Props) {
  const [licensedLinks, setLicensedLinks] = useState<LicensedLink[]>([]);
  const premiumLinks = getPremiumModuleNavLinks(userRole);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d.data?.role;
        const loadModules = (mod: { success?: boolean; data?: { activeModules?: Array<{ moduleKey: string; label: string; ctaHref: string }> } }) => {
          if (!mod.success) return;
          const links: LicensedLink[] = (mod.data?.activeModules || [])
            .map((m) => ({
              href: m.ctaHref,
              label: m.label,
              icon: MARKETPLACE_MODULES[m.moduleKey as MarketplaceModuleKey]?.icon,
            }))
            .filter((l: LicensedLink) => l.icon);
          const hasLinkSlash = (mod.data?.activeModules || []).some((m) => m.moduleKey === "LINKSLASH");
          if (hasLinkSlash) {
            links.unshift({ href: "/linkslash/downloads", label: "LinkSlash APK İndir", icon: Download });
          }
          setLicensedLinks(links);
        };

        if (isSuperAdmin(role)) {
          return fetch("/api/dealer/modules").then((r) => r.json()).then(loadModules);
        }
        if (isAdminRole(role)) {
          setLicensedLinks([
            { href: "/linkslash/downloads", label: "LinkSlash APK İndir", icon: Download },
            { href: `${getAdminSecretPath()}/linkslash`, label: "LinkSlash Yönetim", icon: MARKETPLACE_MODULES.LINKSLASH.icon },
          ]);
          return;
        }
        if (role !== "dealer") {
          setLicensedLinks([]);
          return;
        }
        return fetch("/api/dealer/modules")
          .then((r) => r.json())
          .then(loadModules);
      })
      .catch(() => setLicensedLinks([]));
  }, []);

  return (
    <div className="app-viewport min-h-screen w-full animate-fade-in bg-ena-dark">
      <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 lg:py-8">
        {/* Top header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ena-primary mb-1">Hesap Merkezi</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-ena-text tracking-tight">Hesabım</h1>
            <p className="text-sm text-ena-light mt-1">{userName} · {userEmail}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-1 mb-6 border-b border-ena-border overflow-x-auto scrollbar-none lg:hidden pb-px">
          {ACCOUNT_NAV.flatMap((g) => g.items)
            .filter((item, i, arr) => item.type === "tab" && arr.findIndex((x) => x.type === "tab" && x.key === item.key) === i)
            .map((item) => {
              if (item.type !== "tab") return null;
              const Ic = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onTab(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    active ? "border-ena-primary text-ena-primary" : "border-transparent text-ena-light hover:text-ena-text"
                  }`}
                >
                  <Ic size={14} /> {item.label}
                </button>
              );
            })}
        </div>

        <div className="flex gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin pr-1">
              <div className="acc-card p-4">
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={logo} alt="" className="w-11 h-11 rounded-xl object-cover border border-ena-border" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl border border-ena-border bg-ena-primary/10 flex items-center justify-center text-ena-primary font-bold">
                      {(userName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ena-text truncate">{userName}</p>
                    <p className="text-xs text-ena-light truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              {ACCOUNT_NAV.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-ena-light/50">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.label === "Premium Modüller" &&
                      premiumLinks
                        .filter((item): item is Extract<typeof item, { type: "link" }> => item.type === "link")
                        .map((item) => (
                        <NavLinkItem
                          key={item.href + item.label}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          active={activePath === item.href}
                        />
                      ))}
                    {group.label === "Premium Modüller" &&
                      licensedLinks.map((link) => (
                        <NavLinkItem
                          key={link.href + link.label}
                          href={link.href}
                          label={link.label}
                          icon={link.icon}
                          active={activePath === link.href}
                        />
                      ))}
                    {group.items.map((item, idx) => {
                      const Ic = item.icon;
                      if (item.type === "link") {
                        const linkActive = activePath === item.href;
                        return (
                          <NavLinkItem
                            key={`${item.href}-${idx}`}
                            href={item.href}
                            label={item.label}
                            icon={Ic}
                            active={linkActive}
                          />
                        );
                      }
                      const active = tab === item.key;
                      return (
                        <button
                          key={`${item.key}-${item.label}-${idx}`}
                          onClick={() => onTab(item.key)}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            active
                              ? "bg-ena-primary/10 text-ena-primary font-semibold border border-ena-primary/20 shadow-sm"
                              : "text-ena-light hover:text-ena-text hover:bg-ena-card/60 border border-transparent"
                          }`}
                        >
                          <Ic size={16} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={onLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-ena-light hover:text-nexa-danger hover:bg-nexa-danger/5 border border-transparent hover:border-nexa-danger/20 transition-all"
              >
                <LogOut size={16} /> Çıkış
              </button>
            </div>
          </aside>

          <main className="flex-1 min-w-0 animate-fade-in-up">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AccPageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h2 className="text-lg font-semibold text-ena-text">{title}</h2>
        {description && <p className="text-sm text-ena-light mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AccCard({ children, className = "", interactive = false }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return <div className={`${interactive ? "acc-card-interactive" : "acc-card"} p-5 ${className}`}>{children}</div>;
}

export function AccEmpty({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="acc-card border-dashed p-12 text-center">
      <Icon size={40} className="mx-auto text-ena-light/25 mb-3" />
      <p className="text-ena-text font-medium">{title}</p>
      {description && <p className="text-sm text-ena-light mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AccSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="acc-skeleton h-20" />
      ))}
    </div>
  );
}

export function AccStatCard({ label, value, icon: Icon, accent = "primary" }: { label: string; value: string | number; icon: LucideIcon; accent?: "primary" | "success" | "warning" | "info" }) {
  const accentMap = {
    primary: "text-ena-primary bg-ena-primary/10",
    success: "text-nexa-success bg-nexa-success/10",
    warning: "text-nexa-warning bg-nexa-warning/10",
    info: "text-nexa-primary bg-nexa-primary/10",
  };
  return (
    <div className="acc-card-interactive p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${accentMap[accent]}`}>
          <Icon size={18} />
        </div>
        <span className="text-2xl font-bold text-ena-text tabular-nums">{value}</span>
      </div>
      <p className="text-xs text-ena-light font-medium">{label}</p>
    </div>
  );
}

export function AccTableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="acc-card overflow-hidden p-0">
      <div className="table-scroll">{children}</div>
    </div>
  );
}
