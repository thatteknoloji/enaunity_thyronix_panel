"use client";

import { PodCoreDevShell } from "@/components/pod-core/PodCoreDevShell";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ArrowLeft, Users } from "lucide-react";

export default function AdminPodDesignStudioPage() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={toAdminUrl("/admin/pod")}
            className="inline-flex items-center gap-1 text-xs text-ena-text-muted hover:text-ena-text mb-2"
          >
            <ArrowLeft size={14} /> POD Genel Bakış
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">POD Merkezi</p>
          <h1 className="text-2xl font-bold text-ena-text">POD Tasarım Stüdyosu</h1>
          <p className="text-sm text-ena-text-muted mt-1">
            Pod Core editör — şablon seçimi, canlı fiyat, proje kaydı ve production pack.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-ena-border bg-white/5 px-4 py-3 text-xs text-ena-text-muted max-w-sm">
          <div className="flex items-center gap-2 font-medium text-ena-text mb-1">
            <Users size={14} className="text-emerald-600" />
            Bayi adına tasarım (placeholder)
          </div>
          Bayi seçimi sonraki fazda eklenecek. Şu an admin kendi adına tasarım oluşturabilir.
        </div>
      </div>
      <PodCoreDevShell />
    </div>
  );
}
