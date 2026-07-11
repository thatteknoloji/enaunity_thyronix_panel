"use client";

import { useEffect, useState } from "react";
import { Loader2, Link2, ArrowRight } from "lucide-react";
import Link from "next/link";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing"; reason?: string; code?: string }
  | { step: "pending"; reason?: string; code?: string }
  | { step: "dealer_required"; reason?: string }
  | { step: "ready"; redirectTo: string }
  | { step: "error"; message: string };

export default function LinkSlashGatewayPage() {
  const [state, setState] = useState<GatewayState>({ step: "loading" });

  useEffect(() => {
    fetch("/api/gateway/linkslash")
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
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  if (state.step === "auth_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Link2 className="mx-auto mb-4 text-cyan-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">LinkSlash</h1>
          <p className="text-ena-light mb-6">Devam etmek için giriş yapın.</p>
          <Link
            href="/auth/login?redirect=/gateway/linkslash"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black"
          >
            Giriş Yap <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "dealer_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Link2 className="mx-auto mb-4 text-cyan-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">LinkSlash</h1>
          <p className="text-ena-light mb-6">{state.reason || "LinkSlash için bayi hesabı gerekli"}</p>
          <Link href="/is-ortakligi" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black">
            İş Ortaklığı <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pending") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-amber-500/20 bg-ena-card p-8 text-center">
          <Link2 className="mx-auto mb-4 text-cyan-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">LinkSlash</h1>
          <p className="text-ena-light mb-4">{state.reason || "Lisans onayı bekleniyor"}</p>
          <p className="text-sm text-amber-400 mb-6">Ödeme veya admin onayı tamamlandığında erişim açılacak.</p>
          {state.code === "BAYI_ONAYI_YOK" && (
            <Link href="/account#profile" className="text-sm text-cyan-400 hover:underline">
              Bayi profilime git
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (state.step === "pricing") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Link2 className="mx-auto mb-4 text-cyan-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">LinkSlash</h1>
          <p className="text-ena-light mb-2">
            {state.reason || "LinkSlash lisansınız bulunmuyor."}
          </p>
          <p className="text-sm text-ena-light/70 mb-6">
            Bu modül hesabınıza tanımlı değil; uygulama açılmaz. Lisans satın alarak veya admin ataması ile
            aktifleştirebilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black"
            >
              Lisans Satın Al <ArrowRight size={16} />
            </Link>
            <Link
              href="/dealer/modules"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ena-border px-5 py-2.5 text-sm text-white hover:bg-ena-card"
            >
              Modül Pazarı
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-red-400">{state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-cyan-400 hover:underline"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <p className="text-ena-light text-sm">LinkSlash durumu yüklenemedi.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-cyan-400 hover:underline"
        >
          Tekrar dene
        </button>
        <Link href="/dealer/modules" className="block text-sm text-ena-light/70 hover:text-cyan-400">
          Modül Pazarı&apos;na dön
        </Link>
      </div>
    </div>
  );
}
