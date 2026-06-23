"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, Link2, Package, Shirt, Sparkles, Store } from "lucide-react";
import { canSeeAdminEntry, getAdminSecretPath, isSuperAdmin } from "@/lib/auth/admin-access";
import { MARKETPLACE_MODULES, type MarketplaceModuleKey } from "@/lib/modules/marketplace";

type NavItem = {
  moduleKey: MarketplaceModuleKey;
  label: string;
  href: string;
  description: string;
  colorClass: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const MODULE_ORDER: MarketplaceModuleKey[] = [
  "AI_PAGE_FACTORY",
  "AI_DROPSHIP",
  "THYRONIX",
  "HIVE",
  "LINKSLASH",
  "POD_CREATOR",
];

const MODULE_COLOR: Record<MarketplaceModuleKey, string> = {
  AI_PAGE_FACTORY: "text-violet-400",
  AI_DROPSHIP: "text-orange-400",
  THYRONIX: "text-blue-400",
  HIVE: "text-violet-400",
  LINKSLASH: "text-cyan-400",
  POD_CREATOR: "text-emerald-400",
};

const MODULE_ICON: Record<MarketplaceModuleKey, NavItem["icon"]> = {
  AI_PAGE_FACTORY: Layers,
  AI_DROPSHIP: Store,
  THYRONIX: Package,
  HIVE: Sparkles,
  LINKSLASH: Link2,
  POD_CREATOR: Shirt,
};

function buildPublicItems(): NavItem[] {
  return MODULE_ORDER.map((key) => {
    const meta = MARKETPLACE_MODULES[key];
    return {
      moduleKey: key,
      label: meta.label,
      href: meta.marketingPath,
      description: meta.description,
      colorClass: MODULE_COLOR[key],
      icon: MODULE_ICON[key],
    };
  });
}

function buildAdminItems(role: string): NavItem[] {
  const secret = getAdminSecretPath();
  const superAdmin = isSuperAdmin(role);
  return MODULE_ORDER.map((key) => {
    const meta = MARKETPLACE_MODULES[key];
    let href = meta.gatewayPath;
    if (key === "AI_PAGE_FACTORY") href = `${secret}/page-factory`;
    else if (key === "POD_CREATOR") href = `${secret}/pod`;
    else if (superAdmin && key === "LINKSLASH") href = meta.appPath;
    return {
      moduleKey: key,
      label: meta.label,
      href,
      description: meta.description,
      colorClass: MODULE_COLOR[key],
      icon: MODULE_ICON[key],
    };
  });
}

function buildDealerItems(
  dealerModules: Array<{ moduleKey: string; label: string; href: string }>
): NavItem[] {
  const licensed = new Map(dealerModules.map((m) => [m.moduleKey, m]));
  return MODULE_ORDER.map((key) => {
    const meta = MARKETPLACE_MODULES[key];
    const licensedItem = licensed.get(key);
    return {
      moduleKey: key,
      label: licensedItem?.label || meta.label,
      href: licensedItem?.href || meta.marketingPath,
      description: meta.description,
      colorClass: MODULE_COLOR[key],
      icon: MODULE_ICON[key],
    };
  });
}

type Props = {
  user: { name: string; role: string } | null;
  dealerModules?: Array<{ moduleKey: string; label: string; href: string }>;
  variant?: "header" | "drawer";
  onNavigate?: () => void;
};

export function PlatformNavDropdown({ user, dealerModules = [], variant = "header", onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "header") return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [variant]);

  const items = !user
    ? buildPublicItems()
    : user.role === "dealer"
      ? buildDealerItems(dealerModules)
      : canSeeAdminEntry(user.role)
        ? buildAdminItems(user.role)
        : buildPublicItems();

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  if (variant === "drawer") {
    return (
      <div className="mb-1">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ena-light/50">Platform Ekosistemi</p>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.moduleKey}
              href={item.href}
              onClick={close}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-ena-card transition-colors ${
                item.moduleKey === "AI_PAGE_FACTORY" ? "bg-violet-500/5 border border-violet-500/15 mb-0.5" : ""
              }`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${item.colorClass}`} />
              <span>
                <span className={`block font-medium ${item.colorClass}`}>{item.label}</span>
                <span className="block text-[11px] text-ena-light/70 line-clamp-1">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Layers size={15} className="text-violet-400" />
        <span>Platform</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-ena-border bg-ena-dark py-2 shadow-2xl">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ena-light/50">Ekosistem</p>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.moduleKey}
                  href={item.href}
                  onClick={close}
                  className={`flex items-start gap-3 px-4 py-2.5 hover:bg-ena-card/60 transition-colors ${
                    item.moduleKey === "AI_PAGE_FACTORY" ? "bg-violet-500/5" : ""
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${item.colorClass}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${item.colorClass}`}>{item.label}</span>
                    <span className="block text-[11px] text-ena-light/65 line-clamp-2 leading-snug">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
