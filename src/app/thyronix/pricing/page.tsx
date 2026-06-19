"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Check, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Plan { id: string; planKey: string; name: string; description: string; monthlyPrice: number; yearlyPrice: number; featuresJson: string; limitsJson: string; }

export default function ThyronixPricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { setUser(d.data); });
    fetch("/api/modules/plans?moduleKey=THYRONIX").then(r => r.json()).then(d => { if (d.success) setPlans(d.data); setLoading(false); });
  }, []);

  const handleRequest = (planKey: string) => {
    if (!user) return toast.error("Önce giriş yapın");
    router.push(`/payment/checkout?type=module&moduleKey=THYRONIX&planKey=${planKey}`);
  };

  if (loading) return <div className="min-h-screen bg-ena-dark flex items-center justify-center"><Loader2 size={32} className="animate-spin text-ena-primary"/></div>;

  return (
    <div className="min-h-screen bg-ena-dark">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            <Zap size={16}/> Premium Modül
          </div>
          <h1 className="text-4xl font-bold text-ena-text mb-3">THYRONIX Paketleri</h1>
          <p className="text-ena-light max-w-xl mx-auto">Ürün operasyonlarınızı otomatikleştirin. Size en uygun paketi seçin.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className={`rounded-2xl bg-ena-card border p-6 flex flex-col ${p.planKey === "pro" ? "border-blue-500/30 ring-1 ring-blue-500/20" : "border-ena-border"}`}>
              {p.planKey === "pro" && <span className="text-xs text-blue-400 font-medium mb-3 bg-blue-500/10 px-3 py-1 rounded-full w-fit">En Popüler</span>}
              <h3 className="text-lg font-bold text-ena-text mb-1">{p.name}</h3>
              <p className="text-xs text-ena-text-muted mb-4">{p.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-ena-text">₺{p.monthlyPrice}</span>
                <span className="text-ena-text-muted text-sm">/ay</span>
              </div>
              {p.yearlyPrice > 0 && <p className="text-xs text-ena-text-muted mb-4">₺{p.yearlyPrice}/yıl ({(100 - Math.round(p.yearlyPrice * 100 / (p.monthlyPrice * 12)))}% tasarruf)</p>}
              <div className="flex-1 space-y-2 mb-6">
                {JSON.parse(p.featuresJson || "[]").map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ena-light">
                    <Check size={14} className="text-green-400 shrink-0 mt-0.5"/>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => handleRequest(p.planKey)} disabled={requesting === p.planKey}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${p.planKey === "pro" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-ena-card border border-ena-border text-ena-text hover:bg-ena-gray"}`}>
                {requesting === p.planKey ? <Loader2 size={14} className="animate-spin"/> : "Başvur"} <ArrowRight size={14}/>
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-ena-text-muted text-sm hover:text-ena-primary">ENA'ya Dön</Link>
        </div>
      </div>
    </div>
  );
}
