"use client";

import Link from "next/link";
import { PageFactoryShell } from "@/components/page-factory/PageFactoryShell";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { Database } from "lucide-react";

export default function AdminPageFactoryPage() {
  return (
    <div className="p-6 space-y-4">
      <Link
        href={toAdminUrl("/admin/page-factory/data")}
        className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
      >
        <Database size={16} />
        Veri Evreni Yönetimi (GEO · Sektör · Niyet)
      </Link>
      <PageFactoryShell showLicensePanel />
    </div>
  );
}
