import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-ena-text mb-2">Ödeme Onaylandı</h1>
        <p className="text-ena-light mb-8">Modül lisansınız aktifleştirildi. Kullanmaya başlayabilirsiniz.</p>
        <Link href="/dealer" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ena-primary text-white font-medium hover:brightness-90">
          Panele Git <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
