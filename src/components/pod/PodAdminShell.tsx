"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  stubLabel?: "Beta" | "Yakında";
  children?: React.ReactNode;
};

export function PodAdminShell({
  title,
  description,
  backHref = "/admin/pod",
  stubLabel,
  children,
}: Props) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={toAdminUrl(backHref)} className="text-ena-text-muted hover:text-ena-text">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">POD Merkezi</p>
          <h1 className="text-2xl font-bold text-ena-text flex items-center gap-2 flex-wrap">
            {title}
            {stubLabel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {stubLabel}
              </span>
            )}
          </h1>
          {description && <p className="text-sm text-ena-text-muted mt-1">{description}</p>}
        </div>
      </div>
      {children || (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900">
          {stubLabel === "Yakında"
            ? "Bu bölüm sonraki fazda tamamlanacak."
            : "Modül altyapısı hazır."}
        </div>
      )}
    </div>
  );
}
