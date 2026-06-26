"use client";

import Link from "next/link";
import { ExternalLink, Layers } from "lucide-react";
import type { PodProfileCard, PodUiRole } from "@/lib/pod-core/pod-ui-bridge";

type Props = {
  role: PodUiRole;
  profiles: PodProfileCard[];
};

export function PodProfileGrid({ role, profiles }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ürün Şablonları</h1>
        <p className="text-sm text-ena-light mt-1">
          POD Core ürün profilleri — {role === "dealer" ? "bayi" : "admin"} ve motor aynı kaynak.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Layers size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-ena-light">{p.category}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  p.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {p.status === "active" ? "Aktif" : "Beta"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-ena-light/80">
              <div>
                <dt className="text-ena-light/50">Katalog</dt>
                <dd className="font-medium text-white/90">{p.catalogId || "—"}</dd>
              </div>
              <div>
                <dt className="text-ena-light/50">Fiyat modu</dt>
                <dd className="font-medium text-white/90">{p.formulaHint}</dd>
              </div>
              <div>
                <dt className="text-ena-light/50">Hazır ebat</dt>
                <dd className="font-medium text-white/90">{p.fixedSizeCount}</dd>
              </div>
              <div>
                <dt className="text-ena-light/50">Mockup</dt>
                <dd className="font-medium text-white/90 truncate">{p.mockupType}</dd>
              </div>
            </dl>
            <Link
              href={p.studioHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              Tasarım oluştur <ExternalLink size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
