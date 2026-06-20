"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import SitePageShell from "@/components/site/SitePageShell";

interface Contract {
  id: string;
  slug: string;
  title: string;
  active: boolean;
}

export default function ContractsListPage() {
  const { t } = useT();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contracts")
      .then((r) => r.json())
      .then((d) => { if (d.success) setContracts(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SitePageShell
      title={t("common.all_contracts") || "Sözleşmeler"}
      subtitle="KVKK, gizlilik, mesafeli satış ve diğer yasal metinler."
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-ena-card/30" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <FileText size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light/50">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Link
              key={c.id}
              href={`/contracts/${c.slug}`}
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-ena-card/30 p-5 transition-colors hover:border-ena-primary/30 hover:bg-ena-card/50"
            >
              <div>
                <h2 className="text-lg font-semibold text-ena-text">{c.title}</h2>
                <p className="mt-1 text-xs text-ena-light/60">/{c.slug}</p>
              </div>
              <ChevronRight size={20} className="text-ena-light/40 transition-colors group-hover:text-ena-text" />
            </Link>
          ))}
        </div>
      )}
    </SitePageShell>
  );
}
