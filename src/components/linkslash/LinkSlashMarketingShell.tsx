"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LINKSLASH_BRAND } from "@/lib/linkslash/brand";

type Props = {
  children: React.ReactNode;
  active?: "product" | "downloads";
};

export function LinkSlashMarketingShell({ children, active }: Props) {
  const { colors, routes, name } = LINKSLASH_BRAND;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = (key: "product" | "downloads") =>
    `block rounded-lg px-3 py-2.5 transition-colors ${
      active === key ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-screen text-white" style={{ background: colors.darkGradient }}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/linkslash" className="shrink-0 text-lg font-black tracking-tight">
            <span style={{ color: colors.primary }}>Link</span>Slash
          </Link>

          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <Link href="/linkslash" className={navLinkClass("product")}>
              Ürün
            </Link>
            <Link href={routes.downloads} className={navLinkClass("downloads")}>
              İndirme Merkezi
            </Link>
            <Link href={routes.gateway} className="rounded-lg px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white">
              Giriş
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link
              href={routes.checkout}
              className="hidden rounded-lg px-4 py-2 font-semibold text-black transition-colors hover:opacity-90 sm:inline-flex"
              style={{ backgroundColor: colors.primary }}
            >
              Planları Gör
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 sm:hidden"
              aria-label="Menü"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-white/10 px-6 py-3 text-sm sm:hidden">
            <Link href="/linkslash" className={navLinkClass("product")} onClick={() => setMobileOpen(false)}>
              Ürün
            </Link>
            <Link href={routes.downloads} className={navLinkClass("downloads")} onClick={() => setMobileOpen(false)}>
              İndirme Merkezi
            </Link>
            <Link
              href={routes.gateway}
              className="mt-1 block rounded-lg px-3 py-2.5 text-white/70 hover:bg-white/5 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              Giriş
            </Link>
            <Link
              href={routes.checkout}
              className="mt-2 block rounded-lg px-4 py-2.5 text-center font-semibold text-black"
              style={{ backgroundColor: colors.primary }}
              onClick={() => setMobileOpen(false)}
            >
              Planları Gör
            </Link>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>{name} — ENAUNITY Modülü</span>
          <div className="flex flex-wrap gap-4">
            <Link href={routes.gateway} className="hover:text-white/80">
              Başlat
            </Link>
            <Link href={routes.downloads} className="hover:text-white/80">
              İndirme Merkezi
            </Link>
            <Link href="/downloads/linkslash/INSTALLATION.md" className="hover:text-white/80">
              Kurulum
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
