"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/header";
import FooterWrapper from "@/components/layout/footer-wrapper";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";
import { isAdminPath } from "@/lib/auth/admin-access";

function isStandaloneProductPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/thyronix") ||
    pathname.startsWith("/hive") ||
    pathname.startsWith("/gateway") ||
    pathname.startsWith("/linkslash/mobile")
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDealer = pathname?.startsWith("/dealer");
  const isAdmin = isAdminPath(pathname);
  const isThyronix = pathname?.startsWith("/thyronix");
  const isProductShell = isStandaloneProductPath(pathname);

  if (isDealer || isAdmin || isThyronix || isProductShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="app-viewport flex-1">{children}</main>
      <FooterWrapper />
      <CookieConsentBanner />
    </>
  );
}
