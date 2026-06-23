"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Layers, ArrowRight } from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

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
    fetchPageFactoryJson<GatewayState>("/api/gateway/page-factory")
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/platform/page-factory" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
              Tanıtım
            </Link>
            <Link href="/dealer/modules" className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 px-5 py-2.5 text-sm font-semibold text-violet-300">
              Modül Pazarı
            </Link>
            <Link href="/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
              Satın Al <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === "pending") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-amber-500/20 bg-ena-card p-8 text-center">
          <Layers className="mx-auto mb-4 text-amber-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">Onay Bekleniyor</h1>
          <p className="text-ena-light mb-6 text-sm">{state.reason || "Lisans onayı bekleniyor"}</p>
          <Link href="/dealer/modules" className="inline-flex items-center gap-2 rounded-xl bg-ena-primary px-5 py-2.5 text-sm font-semibold text-white">
            Modül Pazarına Dön
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "dealer_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Layers className="mx-auto mb-4 text-violet-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">Bayi Hesabı Gerekli</h1>
          <p className="text-ena-light mb-6 text-sm">{state.reason || "AI Page Factory bayi hesapları için kullanılabilir."}</p>
          <Link href="/platform/page-factory" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
            Tanıtım Sayfası <ArrowRight size={16} />
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

  if (state.step === "error") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center text-ena-light text-sm">{state.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
      <div className="max-w-md text-center text-ena-light text-sm">Erişim bekleniyor</div>
    </div>
  );
}
