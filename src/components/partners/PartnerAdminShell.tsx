"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  children?: React.ReactNode;
};

export function PartnerAdminShell({ title, description, backHref = "/admin/partners", children }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl(backHref)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
      {children || (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Modül altyapısı hazır — Faz 1 entegrasyonu sonraki sprintte genişletilecek.
        </div>
      )}
    </div>
  );
}
