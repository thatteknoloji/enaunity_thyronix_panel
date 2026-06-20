"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPlatformAdmin } from "@/lib/product-auth/admin-bypass";

export default function HiveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const isPublic = pathname === "/hive/login" || pathname === "/hive/pricing" || pathname === "/hive/pending";

  useEffect(() => {
    if (isPublic) return;

    const checkAuth = async () => {
      const productSession = await fetch("/api/product-auth/session?productType=HIVE");
      if (productSession.ok) {
        const pd = await productSession.json();
        if (pd.success) {
          setAuthorized(true);
          return;
        }
      }

      const me = await fetch("/api/auth/me");
      const d = await me.json();
      if (d.data && (isPlatformAdmin(d.data.role) || d.data.role === "dealer")) {
        setAuthorized(true);
        return;
      }

      router.push("/gateway/hive");
    };

    checkAuth();
  }, [router, isPublic]);

  if (isPublic) return <div className="app-viewport min-h-screen w-full">{children}</div>;
  if (!authorized) {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <div className="animate-pulse h-10 w-10 rounded-full bg-ena-gray" />
      </div>
    );
  }

  return <>{children}</>;
}
