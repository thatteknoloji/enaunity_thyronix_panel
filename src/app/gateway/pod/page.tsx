"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Shirt, ArrowRight } from "lucide-react";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing"; reason?: string; redirectTo?: string }
  | { step: "pending"; reason?: string }
  | { step: "expired"; reason?: string; redirectTo?: string }
  | { step: "dealer_required"; reason?: string; redirectTo?: string }
  | { step: "ready"; redirectTo: string }
  | { step: "error"; message: string };

export default function PodGatewayPage() {
  const router = useRouter();
  const [state, setState] = useState<GatewayState>({ step: "loading" });

  useEffect(() => {
    fetch("/api/gateway/pod")
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
        setState(payload);
        if (payload.step === "ready" && "redirectTo" in payload && payload.redirectTo) {
          router.replace(payload.redirectTo);
        }
      })
      .catch(() => setState({ step: "error", message: "Bağlantı hatası" }));
  }, [router]);

  if (state.step === "loading" || state.step === "ready") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (state.step === "auth_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Shirt className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
          <p className="text-ena-light mb-2">Tasarımcı Modülü</p>
          <p className="text-ena-light mb-6">Devam etmek için giriş yapın.</p>
          <Link href="/auth/login?redirect=/gateway/pod" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">
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
          <Shirt className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
          <p className="text-ena-light mb-6">{state.reason || "POD Creator için bayi hesabı gerekli"}</p>
          <Link
            href={state.redirectTo || "/is-ortakligi"}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {(state.redirectTo || "").includes("/dealer/profile") ? "Bayi Profilim" : "Bayi Başvurusu"}{" "}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pending") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Shirt className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
          <p className="text-ena-light mb-4">{state.reason || "Onay bekleniyor"}</p>
          <p className="text-sm text-amber-400">Admin onayı veya ödeme tamamlandığında erişim açılacak.</p>
        </div>
      </div>
    );
  }

  if (state.step === "expired") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-500/20 bg-ena-card p-8 text-center">
          <Shirt className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
          <p className="text-ena-light mb-6">{state.reason || "Lisans süreniz dolmuş"}</p>
          <Link
            href={state.redirectTo || "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter"}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Yenile <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pricing") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Shirt className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
          <p className="text-sm text-emerald-400/80 mb-1">Tasarımdan Ürüne</p>
          <p className="text-ena-light mb-4">
            {state.reason || "Kendi tasarımlarını ürüne dönüştür, satış ve kazançlarını takip et."}
          </p>
          <p className="text-xs text-ena-light/70 mb-6">
            Tasarım yükleme ve mockup üretimi yakında aktif olacak. Şimdi lisans alarak hazır olun.
          </p>
          <Link
            href={
              state.redirectTo || "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter"
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Satın Al <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
      <p className="text-red-400">{state.message}</p>
    </div>
  );
}
