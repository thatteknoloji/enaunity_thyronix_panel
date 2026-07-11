"use client";

import { PodEditorProShell } from "@/components/pod-editor-pro/PodEditorProShell";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ArrowLeft, Users } from "lucide-react";

export default function AdminPodDesignStudioPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] p-4 gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <Link
            href={toAdminUrl("/admin/pod")}
            className="inline-flex items-center gap-1 text-xs text-ena-text-muted hover:text-ena-text mb-1"
          >
            <ArrowLeft size={14} /> POD Genel Bakış
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">POD Merkezi</p>
          <h1 className="text-xl font-bold text-ena-text">POD Tasarım Stüdyosu</h1>
        </div>
        <div className="rounded-lg border border-dashed border-ena-border bg-white/5 px-3 py-2 text-[11px] text-ena-text-muted max-w-xs">
          <div className="flex items-center gap-2 font-medium text-ena-text mb-0.5">
            <Users size={12} className="text-emerald-600" />
            Bayi adına tasarım (placeholder)
          </div>
          Bayi seçimi sonraki fazda.
        </div>
      </div>
      <PodEditorProShell role="admin" />
    </div>
  );
}
