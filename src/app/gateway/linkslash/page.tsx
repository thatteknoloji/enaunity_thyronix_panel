"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, ArrowRight } from "lucide-react";
import Link from "next/link";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing"; reason?: string; code?: string }
  | { step: "pending"; reason?: string }
  | { step: "dealer_required"; reason?: string }
  | { step: "ready"; redirectTo: string }
  | { step: "error"; message: string };

export default function LinkSlashGatewayPage() {
  const router = useRouter();
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
        setState(payload);
        if (payload.step === "ready" && "redirectTo" in payload && payload.redirectTo) {
          router.replace(payload.redirectTo);
        }
      })
      .catch(() => setState({ step: "error", message: "Bağlantı hatası" }));
  }, [router]);

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
          <Link href="/auth/login?redirect=/gateway/linkslash" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black">
            Giriş Yap <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "pricing" || state.step === "pending" || state.step === "dealer_required") {
    const isPending = state.step === "pending";
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ena-border bg-ena-card p-8 text-center">
          <Link2 className="mx-auto mb-4 text-cyan-400" size={40} />
          <h1 className="text-2xl font-bold text-white mb-2">LinkSlash</h1>
          <p className="text-ena-light mb-6">{state.reason || "LinkSlash lisansı gerekli"}</p>
          {isPending ? (
            <p className="text-sm text-amber-400">Ödeme veya onay tamamlandığında erişim açılacak.</p>
          ) : (
            <Link
              href="/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black"
            >
              Lisans Satın Al <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-6">
        <p className="text-red-400">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center">
      <Loader2 className="animate-spin text-cyan-400" size={32} />
    </div>
  );
}
