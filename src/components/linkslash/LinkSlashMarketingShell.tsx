import Link from "next/link";
import { LINKSLASH_BRAND } from "@/lib/linkslash/brand";

type Props = {
  children: React.ReactNode;
  active?: "product" | "downloads";
};

export function LinkSlashMarketingShell({ children, active }: Props) {
  const { colors, routes, name } = LINKSLASH_BRAND;

  return (
    <div className="min-h-screen text-white" style={{ background: colors.darkGradient }}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/linkslash" className="text-lg font-black tracking-tight shrink-0">
            <span style={{ color: colors.primary }}>Link</span>Slash
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/linkslash"
              className={`rounded-lg px-3 py-2 transition-colors ${active === "product" ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"}`}
            >
              Ürün
            </Link>
            <Link
              href={routes.downloads}
              className={`rounded-lg px-3 py-2 transition-colors ${active === "downloads" ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"}`}
            >
              İndirme Merkezi
            </Link>
            <Link href={routes.gateway} className="rounded-lg px-3 py-2 text-white/70 hover:text-white hover:bg-white/5">
              Giriş
            </Link>
          </nav>
          <div className="flex gap-2 text-sm shrink-0">
            <Link
              href={routes.checkout}
              className="rounded-lg px-4 py-2 font-semibold text-black transition-colors hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              Planları Gör
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between text-sm text-white/50">
          <span>{name} — ENAUNITY Modülü</span>
          <div className="flex flex-wrap gap-4">
            <Link href={routes.gateway} className="hover:text-white/80">Başlat</Link>
            <Link href={routes.downloads} className="hover:text-white/80">İndirme Merkezi</Link>
            <Link href="/downloads/linkslash/INSTALLATION.md" className="hover:text-white/80">Kurulum</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
