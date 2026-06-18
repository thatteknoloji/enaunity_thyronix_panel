import Link from "next/link";
import { Clock, Banknote, ArrowRight } from "lucide-react";

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Banknote size={28} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-ena-text mb-2">Ödeme Bekleniyor</h1>
        <p className="text-ena-light mb-8">Paket başvurunuz alındı. Ödemeniz admin tarafından onaylandıktan sonra modülünüz aktifleşecektir. Havale/EFT ile ödeme yapıp dekontunuzu profil sayfanızdan yükleyebilirsiniz.</p>
        <div className="space-y-3 text-left rounded-xl bg-ena-card border border-ena-border p-6 mb-6">
          <p className="text-sm text-ena-text-muted"><Clock size={14} className="inline mr-1"/>Onay süresi genellikle 24 saattir.</p>
          <p className="text-sm text-ena-text-muted"><Banknote size={14} className="inline mr-1"/>Havale/EFT dekontu yüklemeyi unutmayın.</p>
        </div>
        <Link href="/dealer/profile" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ena-primary text-white font-medium hover:brightness-90">
          Profilim <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
