"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Layers, ArrowRight } from "lucide-react";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing"; reason?: string }
  | { step: "pending"; reason?: string }
  | { step: "dealer_required"; reason?: string }
  | { step: "ready"; redirectTo: string }
  | { step: "error"; message: string };

export default function PageFactoryGatewayPage() {
  const [state, setState] = useState<GatewayState>({ step: "loading" });

  useEffect(() => {
    fetch("/api/gateway/page-factory")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.code === "AUTH_REQUIRED") {
            setState({ step: "auth_required" });
            return;
          }
          setState({ step: "error", message: d.error || "Gateway hatası" });
          return;
        }
        const payload = d.data as GatewayState;
        if (payload.step === "ready" && payload.redirectTo) {
          window.location.replace(payload.redirectTo);
          return;
        }
        setState(payload);
      })
      .catch(() => setState({ step: "error", message: "Bağlantı hatası" }));
  }, []);

  if (state.step === "loading") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  if (state.step === "auth_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Layers className="mx-auto mb-4 text-violet-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">AI Page Factory</h1>
          <p className="text-ena-light mb-6">Devam etmek için giriş yapın.</p>
          <Link href="/auth/login?redirect=/gateway/page-factory" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
            Giriş Yap <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pricing") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Layers className="mx-auto mb-4 text-violet-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">AI Page Factory</h1>
          <p className="text-ena-light mb-6">{state.reason || "Lisans gerekli"}</p>
          <Link href="/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
            Lisans Satın Al <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "ready") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
      <div className="max-w-md text-center text-ena-light text-sm">
        {state.step === "error" ? state.message : state.reason || "Erişim bekleniyor"}
      </div>
    </div>
  );
}
