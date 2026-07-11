"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function HivePricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hiveSalesActive, setHiveSalesActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { setUser(d.data); });
    fetch("/api/modules/plans?moduleKey=HIVE").then(r => r.json()).then(d => { if (d.success) setPlans(d.data); setLoading(false); });
    fetch("/api/hive/status").then(r => r.json()).then(d => { if (d.success) setHiveSalesActive(d.data.salesActive !== false); });
  }, []);

  const handleRequest = async (planKey: string) => {
    if (!hiveSalesActive) return toast.error("HIVE satışları yakında açılacak");
    if (!user) return toast.error("Önce giriş yapın");
    router.push(`/payment/checkout?type=module&moduleKey=HIVE&planKey=${planKey}`);
  };

  if (loading) return <div className="min-h-screen bg-ena-dark flex items-center justify-center"><Loader2 size={32} className="animate-spin text-violet-400"/></div>;

  return (
    <div className="min-h-screen bg-ena-dark">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            <Sparkles size={16}/> Premium Modül
          </div>
          <h1 className="text-4xl font-bold text-ena-text mb-3">HIVE Paketleri</h1>
          <p className="text-ena-light max-w-xl mx-auto">Dijital varlığınızı büyütün. Görünürlüğünüzü artıracak paketi seçin.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className={`rounded-2xl bg-ena-card border p-6 flex flex-col ${p.planKey === "growth" ? "border-violet-500/30 ring-1 ring-violet-500/20" : "border-ena-border"}`}>
              {p.planKey === "growth" && <span className="text-xs text-violet-400 font-medium mb-3 bg-violet-500/10 px-3 py-1 rounded-full w-fit">En Popüler</span>}
              <h3 className="text-lg font-bold text-ena-text mb-1">{p.name}</h3>
              <p className="text-xs text-ena-text-muted mb-4">{p.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-ena-text">₺{p.monthlyPrice}</span>
                <span className="text-ena-text-muted text-sm">/ay</span>
              </div>
              <div className="flex-1 space-y-2 mb-6">
                {JSON.parse(p.featuresJson || "[]").map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ena-light">
                    <Check size={14} className="text-green-400 shrink-0 mt-0.5"/>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => handleRequest(p.planKey)} disabled={!user || !hiveSalesActive}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${p.planKey === "growth" ? "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50" : "bg-ena-card border border-ena-border text-ena-text hover:bg-ena-gray disabled:opacity-50"}`}>
                {!hiveSalesActive ? "Yakında" : "Başvur"} <ArrowRight size={14}/>
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
