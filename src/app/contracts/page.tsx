"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

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
      .then(r => r.json())
      .then(d => { if (d.success) setContracts(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-8">
        ← {t("common.back_to_home") || "Ana Sayfa"}
      </Link>
      <h1 className="text-3xl font-bold text-ena-text mb-8">{t("common.all_contracts")}</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-ena-card/30 animate-pulse" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl">
          <FileText size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light/50">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <Link
              key={c.id}
              href={`/contracts/${c.slug}`}
              className="flex items-center justify-between rounded-xl border border-ena-border bg-ena-card/30 p-5 hover:bg-ena-card/50 transition-colors group"
            >
              <div>
                <h2 className="text-lg font-semibold text-ena-text">{c.title}</h2>
                <p className="text-sm text-ena-light/70 mt-1">/{c.slug}</p>
              </div>
              <ChevronRight size={20} className="text-ena-light/40 group-hover:text-ena-text transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
