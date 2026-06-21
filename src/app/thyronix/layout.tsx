"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Link2, Package, GitBranch, Radio,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Menu, Brain, Workflow, Rocket, HelpCircle, ListChecks, Activity, Users,
} from "lucide-react";
import { isPlatformAdmin } from "@/lib/product-auth/admin-bypass";
import { OnboardingWizard } from "@/components/thyronix/OnboardingWizard";
import { LegalReacceptanceGate } from "@/components/legal/LegalReacceptanceGate";

const navItems = [
  { href: "/thyronix", label: "Kontrol Merkezi", icon: LayoutDashboard },
  { href: "/thyronix/getting-started", label: "Hızlı Başlangıç", icon: Rocket },
  { href: "/thyronix/sources", label: "Kaynaklar", icon: Link2 },
  { href: "/thyronix/products", label: "Ürünler", icon: Package },
  { href: "/thyronix/processing", label: "İşleme", icon: GitBranch },
  { href: "/thyronix/feeds", label: "Feedler", icon: Radio },
  { href: "/thyronix/ai", label: "THYRONIX AI", icon: Brain, adminOnly: true, planFeature: "aiEnabled" as const },
  { href: "/thyronix/automation", label: "Otomasyon", icon: Workflow, planFeature: "automationEnabled" as const },
  { href: "/thyronix/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/thyronix/system-health", label: "Sistem Sağlığı", icon: Activity },
  { href: "/thyronix/users", label: "Ekip", icon: Users, planFeature: "multiUser" as const },
  { href: "/thyronix/checklist", label: "Kontrol Listesi", icon: ListChecks },
  { href: "/thyronix/help", label: "Yardım", icon: HelpCircle },
  { href: "/thyronix/admin", label: "Yönetim", icon: Settings, adminOnly: true },
];

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#3385ff"/>
      <path d="M14 7L7 11v6l7 4 7-4v-6L14 7z" fill="#080c14"/>
      <circle cx="14" cy="15" r="3" fill="#3385ff"/>
    </svg>
  );
}

export default function ThyronixLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [planLimits, setPlanLimits] = useState<Record<string, boolean | number>>({});
  const isLoginPage = pathname === "/thyronix/login";
  const isPublicPage =
    isLoginPage ||
    pathname.startsWith("/thyronix/pricing") ||
    pathname.startsWith("/thyronix/pending");

  useEffect(() => {
    if (isPublicPage) return;

    const checkAuth = async () => {
      try {
        const productSession = await fetch("/api/product-auth/session?productType=THYRONIX");
        if (productSession.ok) {
          const pd = await productSession.json();
          if (pd.success) {
            setAuthorized(true);
            setIsAdmin(false);
            setUserName(pd.data.name || pd.data.email || "THYRONIX Kullanıcısı");
            return;
          }
        }

        const me = await fetch("/api/auth/me");
        const d = await me.json();
        if (d.data?.role === "admin" || isPlatformAdmin(d.data?.role)) {
          setAuthorized(true);
          setIsAdmin(true);
          setUserName(d.data.name || "Yönetici");
          return;
        }

        if (d.data?.role === "dealer" && d.data?.dealerId) {
          const cp = await fetch("/api/customer-products");
          const cj = await cp.json();
          const thy = cj.success
            ? cj.data.products.find((p: { moduleKey: string; status: string }) => p.moduleKey === "THYRONIX")
            : null;
          if (thy && (thy.status === "ACTIVE" || thy.status === "TRIAL")) {
            setAuthorized(true);
            setIsAdmin(false);
            setUserName(d.data.name || d.data.email || "Bayi");
            return;
          }
        }

        router.push("/gateway/thyronix");
      } catch {
        setAuthError(true);
      }
    };

    checkAuth();
  }, [router, isPublicPage]);

  useEffect(() => {
    if (!authorized || isPublicPage) return;
    fetch("/api/thyronix/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPlanLimits(d.data.limits || {});
          if (!d.data.onboardingCompleted && !isAdmin) {
            setShowOnboarding(true);
            setOnboardingStep(d.data.onboardingStep || 1);
          }
        }
      });
  }, [authorized, isPublicPage, isAdmin]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!authorized || isAdmin || isPublicPage) return;
    if (pathname.startsWith("/thyronix/admin") || pathname.startsWith("/thyronix/ai")) {
      router.replace("/thyronix");
    }
  }, [authorized, isAdmin, isPublicPage, pathname, router]);

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.planFeature && !isAdmin) {
      const val = planLimits[item.planFeature];
      if (typeof val === "boolean" && !val) return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await fetch("/api/product-auth/login?productType=THYRONIX", { method: "DELETE" });
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  };

  if (isPublicPage) return <div className="app-viewport min-h-screen w-full">{children}</div>;
  if (authError) return <div className="flex h-screen items-center justify-center bg-nexa-bg"><div className="text-center"><p className="text-nexa-text-secondary text-sm mb-3">Sunucuya bağlanılamadı</p><button onClick={() => window.location.reload()} className="text-nexa-primary text-sm hover:underline">Tekrar Dene</button></div></div>;
  if (!authorized) return <div className="flex h-screen items-center justify-center bg-nexa-bg"><div className="animate-pulse space-y-3 text-center"><div className="mx-auto h-10 w-10 rounded-full bg-nexa-border"/><div className="h-3 w-28 rounded bg-nexa-border mx-auto"/></div></div>;

  const sidebar = (
    <>
      <div className="flex items-center h-14 px-4 shrink-0">
        <Link href="/thyronix" className="flex items-center gap-2.5">
          <Logo />
          {!collapsed && <span className="text-[15px] font-bold text-nexa-text tracking-tight">THYRONIX</span>}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5 scrollbar-none">
        {visibleNavItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/thyronix" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors group
                ${isActive ? "bg-nexa-primary/10 text-nexa-primary" : "text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-hover"}`}
              title={collapsed ? item.label : undefined}>
              <item.icon size={collapsed ? 20 : 17} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && <span className="ml-auto w-1 h-1 rounded-full bg-nexa-primary"/>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-2.5 shrink-0 border-t border-nexa-border/50">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-nexa-primary/15 flex items-center justify-center text-[11px] font-semibold text-nexa-primary shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-nexa-text truncate">{userName}</p>
              <p className="text-[10px] text-nexa-text-secondary">{isAdmin ? "Yönetici" : "THYRONIX"}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-hover transition-colors cursor-pointer">
          <LogOut size={15} className="shrink-0"/>
          {!collapsed && <span>Çıkış</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="app-viewport flex h-screen max-w-[100dvw] bg-nexa-bg" data-module-shell="thyronix">
      <OnboardingWizard
        open={showOnboarding}
        initialStep={onboardingStep}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />

      <aside className={`hidden md:flex flex-col shrink-0 border-r border-nexa-border bg-nexa-bg transition-all duration-200 relative ${collapsed ? "w-[64px]" : "w-[232px]"}`}>
        {sidebar}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 z-10 hidden md:flex h-5 w-5 items-center justify-center rounded-full border border-nexa-border bg-nexa-card text-nexa-text-secondary hover:text-nexa-text transition-colors">
          {collapsed ? <ChevronRight size={10}/> : <ChevronLeft size={10}/>}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[130] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <aside className="absolute left-0 top-0 bottom-0 w-[272px] flex flex-col bg-nexa-bg border-r border-nexa-border">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center h-12 px-4 md:px-6 border-b border-nexa-border shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden mr-3 p-1 rounded-lg hover:bg-nexa-hover"><Menu size={18} className="text-nexa-text-secondary"/></button>
          <div className="flex-1"/>
          {!isAdmin && (
            <button onClick={() => setShowOnboarding(true)} className="text-[11px] text-nexa-primary hover:underline mr-4">Sihirbaz</button>
          )}
          <Link href="/thyronix/help" className="text-[11px] text-nexa-text-secondary hover:text-nexa-primary transition-colors">Yardım</Link>
        </div>

        <div className="app-main-scroll scrollbar-thin">
          <div className="mx-auto w-full min-w-0 max-w-[1400px] p-5 md:p-7">
            <LegalReacceptanceGate scope="thyronix">{children}</LegalReacceptanceGate>
          </div>
        </div>
      </div>
    </div>
  );
}
