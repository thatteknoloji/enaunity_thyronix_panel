"use client";

import Link from "next/link";
import { ShoppingCart, User, LogOut, LayoutDashboard, Globe, Search, Menu, X, FileText } from "lucide-react";
import { canSeeAdminEntry, getAdminSecretPath } from "@/lib/auth/admin-access";
import { PlatformNavDropdown } from "@/components/layout/PlatformNavDropdown";
import { useCartStore } from "@/lib/cart-store";
import { useT, LOCALE_LABELS, type Locale } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/cart/cart-drawer";
import SmartSearch from "@/components/ui/smart-search";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { XmlCategoryNav } from "@/components/layout/XmlCategoryNav";
import { usePathname, useRouter } from "next/navigation";

const locales = Object.entries(LOCALE_LABELS) as [Locale, string][];

export default function Header() {
  const { t, locale, setLocale } = useT();
  const { items, isOpen, setIsOpen, fetchCart } = useCartStore();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [dealerModules, setDealerModules] = useState<Array<{ moduleKey: string; label: string; href: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.data || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  useEffect(() => {
    if (user?.role !== "dealer") {
      setDealerModules([]);
      return;
    }
    fetch("/api/dealer/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDealerModules(d.data.headerNav || []);
        }
      })
      .catch(() => setDealerModules([]));
  }, [user?.role]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    setMenuOpen(false);
    setExpandedCat(null);
    setLangOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setLangOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-[100] w-full max-w-full overflow-x-clip bg-ena-dark/95 backdrop-blur border-b border-ena-border">
        <div className="mx-auto flex h-16 max-w-7xl min-w-0 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link href="/" className="flex min-w-0 shrink items-baseline gap-1 sm:gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight shrink-0" style={{color:"#e50914"}}>ENA</span>
              <span className="text-xl sm:text-2xl font-light tracking-tight text-ena-text relative truncate">UNITY<sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em] font-light">®</sup></span>
              <span className="hidden md:inline text-[10px] font-medium text-ena-light ml-2 tracking-widest uppercase">
                B4B Platform
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors"
              aria-label={t("common.search")}
            >
              <Search size={18} />
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors"
                title={t("common.language")}
              >
                <Globe size={18} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-lg border border-ena-border bg-ena-dark py-1 shadow-xl">
                    {locales.map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setLocale(key); setLangOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          locale === key ? "text-ena-primary font-semibold" : "text-ena-light hover:text-ena-text hover:bg-ena-card/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            <button
              onClick={() => setIsOpen(true)}
              className="relative rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ena-primary text-[10px] text-ena-text font-bold">
                  {itemCount}
                </span>
              )}
            </button>

            {loading ? null : user ? (
              <div className="hidden md:flex items-center gap-1">
                <PlatformNavDropdown user={user} dealerModules={dealerModules} />
                {canSeeAdminEntry(user.role) && (
                  <Link href={getAdminSecretPath()}>
                    <Button variant="ghost" size="sm" className="text-ena-light">
                      <LayoutDashboard size={16} className="mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}
                {user.role === "dealer" && (
                  <Link href="/dealer">
                    <Button variant="ghost" size="sm" className="text-ena-light">
                      <LayoutDashboard size={16} className="mr-1" />
                      {t("dealer.panel")}
                    </Button>
                  </Link>
                )}
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="text-ena-light">
                    <User size={16} className="mr-1" />
                    Profilim
                  </Button>
                </Link>
                <button onClick={handleLogout} className="rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-white/10 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <PlatformNavDropdown user={null} />
                <Link href="/auth/login">
                  <Button size="sm" variant="ghost" className="text-ena-light">{t("common.login")}</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="bg-ena-primary hover:brightness-90 text-ena-text">{t("common.register")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative z-50 mx-auto max-w-2xl px-4 pt-20">
            <SmartSearch variant="hero" onClose={() => setSearchOpen(false)} autoFocus />
          </div>
        </div>
      )}

      {/* Hamburger Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => { setMenuOpen(false); setExpandedCat(null); }} />
      )}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-ena-dark border-r border-ena-border transform transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"} overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-ena-border">
          <Link href="/" className="flex items-baseline gap-1" onClick={() => setMenuOpen(false)}>
            <span className="text-xl font-black" style={{color:"#e50914"}}>ENA</span>
            <span className="text-xl font-light text-ena-text relative">UNITY<sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em] font-light">®</sup></span>
          </Link>
          <button onClick={() => { setMenuOpen(false); setExpandedCat(null); }} className="text-ena-light hover:text-ena-text">
            <X size={20} />
          </button>
        </div>
        <div className="p-3">
          <Link href="/catalog" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-ena-text hover:bg-ena-card transition-colors mb-1">
            {t("common.products")}
          </Link>
          {user && (
            <Link href="/products" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors mb-1">
              <LayoutDashboard size={16} />
              Ürünlerim
            </Link>
          )}
          <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors mb-1">
            <ShoppingCart size={16} />
            {t("common.cart")}
            {itemCount > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-ena-primary text-[10px] text-ena-text font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          <Link href="/contracts" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors mb-1">
            <FileText size={16} />
            {t("common.contracts")}
          </Link>
          <Link href="/is-ortakligi" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-ena-primary hover:bg-ena-card transition-colors mb-1">
            İş Ortaklığı
          </Link>
          <div className="h-px bg-ena-border my-2" />
          <PlatformNavDropdown
            user={user}
            dealerModules={dealerModules}
            variant="drawer"
            onNavigate={() => setMenuOpen(false)}
          />
          <div className="h-px bg-ena-border my-2" />
          {Object.entries({ "Cam Tablo":["Yatay","Dikey"], "Mdf Tablo":["Çerçeveli","Çerçevesiz"], "Halı":[], "Kilim":[], "Perde":[], "Nevresim":["Çocuk","2 Kişilik","Tek Kişilik"], "Yastık Kılıfı":[], "Minder":[], "Puzzle":["Çocuk","Yetişkin"], "Hediyelik Ürünler":[] } as Record<string, string[]>).map(([cat, subs]) => (
            <div key={cat}>
              <button
                onClick={() => {
                  if (subs.length === 0) { setMenuOpen(false); router.push(`/products?category=${encodeURIComponent(cat)}`); }
                  else setExpandedCat(expandedCat === cat ? null : cat);
                }}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors"
              >
                {cat}
                {subs.length > 0 && (
                  <svg className={`w-4 h-4 transition-transform ${expandedCat === cat ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              {subs.length > 0 && expandedCat === cat && (
                <div className="ml-4 pl-3 border-l border-ena-border space-y-0.5 mt-0.5 mb-1">
                  {subs.map((sub) => (
                    <Link key={sub} href={`/products?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}`} onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-ena-light/70 hover:text-ena-text hover:bg-ena-card/50 transition-colors"
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <XmlCategoryNav onNavigate={() => setMenuOpen(false)} />
          <div className="h-px bg-ena-border my-2" />
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ena-light/50 mb-2">Tema</p>
            <ThemeSwitcher variant="drawer" onSelect={() => setMenuOpen(false)} />
          </div>
          <div className="h-px bg-ena-border my-2" />
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ena-light/50 mb-2">{t("common.language")}</p>
            <div className="space-y-1">
              {locales.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setLocale(key); }}
                  className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    locale === key ? "text-ena-primary font-semibold bg-ena-card" : "text-ena-light hover:text-ena-text hover:bg-ena-card/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-ena-border my-2" />
          {user ? (
            <div className="space-y-1">
              <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors">
                <User size={16} />
                Profilim
              </Link>
              {canSeeAdminEntry(user.role) && (
                <Link href={getAdminSecretPath()} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors">
                  <LayoutDashboard size={16} />
                  Admin Paneli
                </Link>
              )}
              {user.role === "dealer" && (
                <Link href="/dealer" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors">
                  <LayoutDashboard size={16} />
                  {t("dealer.panel")}
                </Link>
              )}
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-ena-primary/70 hover:text-ena-primary hover:bg-ena-card transition-colors">
                <LogOut size={16} />
                {t("common.logout")}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors">
                <User size={16} />
                {t("common.login")}
              </Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-ena-primary hover:bg-ena-card transition-colors">
                {t("common.register")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <CartDrawer open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
