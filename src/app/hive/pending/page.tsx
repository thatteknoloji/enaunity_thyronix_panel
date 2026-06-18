import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

export default function HivePendingPage() {
  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <Clock size={28} className="text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-ena-text mb-2">HIVE — Onay Bekliyor</h1>
        <p className="text-ena-light mb-2">Lisans başvurunuz alındı.</p>
        <p className="text-sm text-ena-text-muted mb-8">Admin onayından sonra HIVE paneline erişebileceksiniz.</p>
        <Link href="/hive/pricing" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ena-card border border-ena-border text-ena-text text-sm hover:bg-ena-gray transition-colors">
          Paketleri Gör <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
