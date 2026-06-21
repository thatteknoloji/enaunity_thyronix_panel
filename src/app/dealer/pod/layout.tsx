"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DealerPodLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/gateway/pod")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.step === "ready") {
          setOk(true);
          return;
        }
        router.replace("/gateway/pod");
      })
      .catch(() => router.replace("/gateway/pod"));
  }, [router]);

  if (ok !== true) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-ena-light text-sm">POD Creator erişimi kontrol ediliyor…</div>
      </div>
    );
  }

  return <div data-module-shell="pod">{children}</div>;
}
