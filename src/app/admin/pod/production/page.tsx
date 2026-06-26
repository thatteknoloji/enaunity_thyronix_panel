import Link from "next/link";
import { PodAdminShell } from "@/components/pod/PodAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

export default function AdminPodProductionPage() {
  return (
    <PodAdminShell
      title="POD Üretim Dosyaları"
      description="Production pack arşivi ve baskı dosyası üretimi"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-2">
          <p className="font-semibold text-gray-900">Production Pack</p>
          <p className="text-sm text-gray-600">
            POD Core V4 production pack; tasarım JSON, önizleme PNG ve baskı PDF çıktılarını tek arşivde toplar.
          </p>
          <p className="text-xs text-emerald-700 font-medium">create-production-file endpoint hazır</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <p className="font-semibold text-gray-900">Kayıtlı projeden üret</p>
          <p className="text-sm text-gray-600">
            Kayıtlı bir POD Core projesi seçildiğinde production pack oluşturma bu fazda placeholder olarak sunulur.
          </p>
          <Link
            href={toAdminUrl("/admin/pod/designs")}
            className="inline-flex rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tasarımları Gör →
          </Link>
        </div>
      </div>
    </PodAdminShell>
  );
}
