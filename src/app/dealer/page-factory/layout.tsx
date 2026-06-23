"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layers, ArrowRight, Store } from "lucide-react";
import { MARKETPLACE_MODULES } from "@/lib/modules/marketplace";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

export default function DealerPageFactoryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    fetchPageFactoryJson<{ step: string; redirectTo?: string }>("/api/gateway/page-factory")
      .then((d) => {
        if (d.success && d.data?.step === "ready") {
          setState("allowed");
          return;
        }
        setState("denied");
      })
      .catch(() => setState("denied"));
  }, [router]);

  if (state === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-ena-dark">
        <div className="animate-pulse text-sm text-ena-light">AI Page Factory erişimi kontrol ediliyor…</div>
      </div>
    );
  }

  if (state === "denied") {
    const meta = MARKETPLACE_MODULES.AI_PAGE_FACTORY;
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-violet-500/20 bg-ena-card p-8 text-center">
          <Layers className="mx-auto mb-4 text-violet-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">AI Page Factory</h1>
          <p className="text-ena-light mb-6 text-sm">
            Bu modül hesabınızda aktif değil. Tanıtım sayfasını inceleyebilir veya Modül Pazarı üzerinden lisans
            satın alabilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={meta.marketingPath}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              Tanıtımı İncele
            </Link>
            <Link
              href="/dealer/modules"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Store size={16} /> Modül Pazarı
            </Link>
            <Link
              href={meta.checkoutPath}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ena-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Satın Al <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <div data-module-shell="page-factory">{children}</div>;
}
