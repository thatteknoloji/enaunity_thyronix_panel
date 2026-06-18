"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canSeeAdminEntry, getAdminSecretPath } from "@/lib/auth/admin-access";
import type { User } from "@/types";
import { AccountShell } from "./AccountShell";
import type { AccountTab } from "./nav";

type AccountCenterContextValue = {
  user: User | null;
  tab: AccountTab;
  setTab: (t: AccountTab) => void;
  logo?: string;
  setLogo: (url: string) => void;
};

const AccountCenterContext = createContext<AccountCenterContextValue | null>(null);

export function useAccountCenter() {
  const ctx = useContext(AccountCenterContext);
  if (!ctx) throw new Error("useAccountCenter must be used within AccountCenterProvider");
  return ctx;
}

export function AccountCenterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AccountTab>("overview");
  const [logo, setLogo] = useState("");

  const isAppearance = pathname === "/account/appearance";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as AccountTab;
      const valid: AccountTab[] = [
        "overview", "profile", "security", "orders", "quotes", "contracts",
        "addresses", "documents", "wishlist", "returns", "quotes", "billing",
        "notifications", "saved-carts", "coupons", "integrations",
      ];
      if (valid.includes(hash)) setTab(hash);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.data) {
          router.push("/auth/login?redirect=/account");
          return;
        }
        setUser(d.data);
        setLoading(false);
      })
      .catch(() => router.push("/auth/login"));
  }, [router]);

  useEffect(() => {
    if (!isAppearance) {
      fetch("/api/dealer/profile")
        .then((r) => r.json())
        .then((d) => { if (d.success && d.data?.logo) setLogo(d.data.logo); })
        .catch(() => {});
    }
  }, [isAppearance]);

  const handleTab = (t: AccountTab) => {
    setTab(t);
    if (pathname !== "/account") router.push("/account");
    window.location.hash = t;
  };

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <div className="acc-skeleton w-64 h-8" />
      </div>
    );
  }

  return (
    <AccountCenterContext.Provider value={{ user, tab, setTab: handleTab, logo, setLogo }}>
      <AccountShell
        tab={isAppearance ? "appearance" : tab}
        onTab={handleTab}
        activePath={pathname}
        userName={user?.name}
        userEmail={user?.email}
        logo={logo}
        onLogout={handleLogout}
        headerActions={
          <>
            {canSeeAdminEntry(user?.role) && (
              <Link href={getAdminSecretPath()}>
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="lg:hidden">
              <LogOut size={16} />
            </Button>
          </>
        }
      >
        {children}
      </AccountShell>
    </AccountCenterContext.Provider>
  );
}
