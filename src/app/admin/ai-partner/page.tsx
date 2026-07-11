import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ArrowLeft } from "lucide-react";

export default function AdminAiPartnerPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={toAdminUrl("/admin/partners")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            AI Partner Merkezi
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Yakında</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Bayi AI içerik üretim modülü — yönetim özeti (Faz 0)</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900">
        Bu modül henüz tamamlanmadı. Altyapı hazır; tam yönetim paneli sonraki fazda açılacak.
      </div>
    </div>
  );
}
