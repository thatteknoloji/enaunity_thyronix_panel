import Link from "next/link";
import { XCircle, ArrowRight } from "lucide-react";

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <XCircle size={28} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-ena-text mb-2">Ödeme Başarısız</h1>
        <p className="text-ena-light mb-8">Ödemeniz tamamlanamadı. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi kullanın.</p>
        <Link href="/thyronix/pricing" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ena-primary text-white font-medium hover:brightness-90">
          Paketlere Dön <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
