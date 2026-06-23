"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminRole } from "@/lib/auth/admin-access";
import { ProductUniverseShell } from "@/components/product-universe/ProductUniverseShell";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

export default function DealerProductUniversePage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.success && isAdminRole(me.data?.role)) {
          setOk(true);
          return;
        }
        return fetchPageFactoryJson<{ step: string }>("/api/gateway/page-factory")
          .then((d) => {
            if (d.success && d.data?.step === "ready") {
              setOk(true);
              return;
            }
            router.replace("/dealer/modules");
          });
      })
      .catch(() => router.replace("/dealer/modules"));
  }, [router]);

  if (ok !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-pulse text-sm text-ena-light">Ürün Evreni erişimi kontrol ediliyor…</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-module-shell="page-factory">
      <ProductUniverseShell mode="dealer" />
    </div>
  );
}
