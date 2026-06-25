import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ArrowLeft } from "lucide-react";

export default function AdminPodLicensesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href={toAdminUrl("/admin/pod")}
          className="inline-flex items-center gap-1 text-xs text-ena-text-muted hover:text-ena-text mb-2"
        >
          <ArrowLeft size={14} /> POD Genel Bakış
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">POD Merkezi</p>
        <h1 className="text-2xl font-bold text-ena-text">POD Lisansları</h1>
        <p className="text-sm text-ena-text-muted mt-1">
          Bayi seç, paket ve süre tanımla — tasarım stüdyosundan ayrı lisans yönetimi.
        </p>
      </div>
      <AdminModuleAccessPanel moduleKey="POD_CREATOR" />
    </div>
  );
}
