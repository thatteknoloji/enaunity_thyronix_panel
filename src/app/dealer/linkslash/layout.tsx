"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DealerLinkSlashLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/gateway/linkslash")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.step === "ready") {
          setOk(true);
          return;
        }
        router.replace("/platform/linkslash");
      })
      .catch(() => router.replace("/platform/linkslash"));
  }, [router]);

  if (ok !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
        <div className="animate-pulse text-sm text-ena-light">LinkSlash erişimi kontrol ediliyor…</div>
      </div>
    );
  }

  return <div data-module-shell="linkslash">{children}</div>;
}
