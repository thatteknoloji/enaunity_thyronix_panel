"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Store, ArrowRight } from "lucide-react";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing" }
  | { step: "pending"; reason?: string }
  | { step: "ready"; redirectTo: string }
  | { step: "error"; message: string };

export default function DropshipGatewayPage() {
  const router = useRouter();
  const [state, setState] = useState<GatewayState>({ step: "loading" });

  useEffect(() => {
    fetch("/api/gateway/dropship")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.code === "AUTH_REQUIRED") {
            setState({ step: "auth_required" });
            return;
          }
          setState({ step: "error", message: d.error || "Bir hata oluştu" });
          return;
        }
        const data = d.data;
        if (data.step === "redirect") {
          router.push(data.redirectTo);
          return;
        }
        setState(data);
      })
      .catch(() => setState({ step: "error", message: "Sunucuya bağlanılamadı" }));
  }, [router]);

  if (state.step === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-400" />
      </div>
    );
  }

  if (state.step === "auth_required") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Dropship Store</h1>
          <p className="text-ena-light">Mağaza oluşturmak için giriş yapmalısınız</p>
          <Link
            href="/auth/login?redirect=/gateway/dropship"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all"
          >
            Giriş Yap
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/20">
            <Loader2 size={32} className="animate-spin text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Onay Bekliyor</h1>
          <p className="text-ena-light">{state.reason || "Lisansınız admin onayı bekliyor"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500">
          <Store size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">AI Dropship Store</h1>
        <p className="text-ena-light">Kendi e-ticaret mağazanı açmak için lisans almalısın</p>
        <Link
          href="/dealer/modules"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all"
        >
          Lisans Al
          <ArrowRight size={18} />
        </Link>
        <div>
          <Link href="/platform/dropship" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
            Daha fazla bilgi →
          </Link>
        </div>
      </div>
    </div>
  );
}
