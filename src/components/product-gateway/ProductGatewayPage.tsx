"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { PRODUCT_LABELS, type ProductType } from "@/lib/product-links/types";

type GatewayState =
  | { step: "loading" }
  | { step: "auth_required" }
  | { step: "pricing"; reason?: string; code?: string }
  | { step: "pending"; reason?: string; code?: string }
  | { step: "dealer_required"; reason?: string }
  | { step: "no_license"; reason: string; code: string }
  | { step: "setup"; productType?: ProductType }
  | { step: "disabled" }
  | { step: "ready"; redirectTo: string; externalEmail?: string }
  | { step: "created"; redirectTo: string; tempPassword?: string; externalEmail?: string }
  | { step: "error"; message: string };

export default function ProductGatewayPage({ productType }: { productType: ProductType }) {
  const router = useRouter();
  const [state, setState] = useState<GatewayState>({ step: "loading" });
  const [creating, setCreating] = useState(false);
  const label = PRODUCT_LABELS[productType];

  useEffect(() => {
    const apiPath = productType === "THYRONIX" ? "/api/gateway/thyronix" : "/api/gateway/hive";

    fetch(apiPath)
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
        const payload = d.data;
        setState(payload);
        if (payload.step === "ready" && payload.redirectTo) {
          setTimeout(() => { window.location.href = payload.redirectTo; }, 1200);
        }
      })
      .catch(() => setState({ step: "error", message: "Bağlantı hatası" }));
  }, [productType]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/product-links/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType }),
      });
      const d = await res.json();
      if (!d.success) {
        setState({ step: "error", message: d.error || "Hesap oluşturulamadı" });
        return;
      }
      const loginPath = productType === "THYRONIX" ? "/thyronix/login" : "/hive/login";
      const email = d.data.link?.externalEmail;
      setState({
        step: "created",
        redirectTo: email ? `${loginPath}?email=${encodeURIComponent(email)}` : loginPath,
        tempPassword: d.data.tempPassword,
        externalEmail: email,
      });
    } catch {
      setState({ step: "error", message: "Bağlantı hatası" });
    } finally {
      setCreating(false);
    }
  };

  if (state.step === "loading") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  if (state.step === "auth_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto text-amber-400" size={40} />
          <h1 className="text-xl font-bold text-white">ENA Girişi Gerekli</h1>
          <p className="text-sm text-ena-light">{label} erişimi için önce ENA hesabınızla giriş yapmalısınız.</p>
          <button
            onClick={() => router.push(`/auth/login?redirect=/gateway/${productType.toLowerCase()}`)}
            className="w-full py-2.5 rounded-lg bg-ena-primary text-white text-sm font-medium"
          >
            ENA Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "pricing" || state.step === "no_license") {
    const pricingPath = productType === "THYRONIX" ? "/thyronix/pricing" : "/hive/pricing";
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto text-red-400" size={40} />
          <h1 className="text-xl font-bold text-white">Lisans Gerekli</h1>
          <p className="text-sm text-ena-light">{state.reason || "Bu ürün için aktif lisans bulunamadı."}</p>
          <button onClick={() => router.push(pricingPath)} className="w-full py-2.5 rounded-lg bg-ena-primary text-white text-sm font-medium">
            Lisans Planlarını Gör
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "pending") {
    const pendingPath = productType === "THYRONIX" ? "/thyronix/pending" : "/hive/pending";
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-amber-500/20 bg-ena-card p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto text-amber-400" size={40} />
          <h1 className="text-xl font-bold text-white">Lisans Onay Bekliyor</h1>
          <p className="text-sm text-ena-light">{state.reason || "THYRONIX lisansınız henüz aktif değil."}</p>
          <button onClick={() => router.push(pendingPath)} className="w-full py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium">
            Durumu Görüntüle
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "dealer_required") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto text-amber-400" size={40} />
          <h1 className="text-xl font-bold text-white">Bayi Hesabı Gerekli</h1>
          <p className="text-sm text-ena-light">{state.reason || "THYRONIX yalnızca lisanslı bayiler için kullanılabilir."}</p>
          <button onClick={() => router.push("/is-ortakligi")} className="w-full py-2.5 rounded-lg bg-ena-primary text-white text-sm font-medium">
            İş Ortaklığı Başvurusu
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "setup" || state.step === "disabled") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 space-y-5">
          <div className="text-center">
            <Link2 className="mx-auto text-blue-400 mb-3" size={40} />
            <h1 className="text-xl font-bold text-white">
              {state.step === "disabled" ? `${label} Bağlantısı Devre Dışı` : `${label} Hesabınız Bulunamadı`}
            </h1>
            <p className="text-sm text-ena-light mt-2">
              {state.step === "disabled"
                ? "Yöneticiniz bu bağlantıyı devre dışı bıraktı. Yeniden eşleştirme için destek alın veya yeni hesap oluşturun."
                : `ENA hesabınızı ${label} ile eşleştirmek için bir ürün hesabı oluşturun. Girişler ayrı kalır; sadece hesaplar bağlanır.`}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 rounded-lg bg-ena-primary hover:brightness-90 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {creating ? "Oluşturuluyor..." : "Hesap Oluştur"}
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "created") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 space-y-5">
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-green-400 mb-3" size={40} />
            <h1 className="text-xl font-bold text-white">{label} Hesabı Oluşturuldu</h1>
            <p className="text-sm text-ena-light mt-2">
              ENA hesabınız {label} ile bağlandı. Ürün girişi bağımsızdır — aşağıdaki bilgilerle {label} paneline giriş yapın.
            </p>
          </div>
          {state.externalEmail && (
            <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-sm space-y-1">
              <p className="text-ena-light">E-posta: <span className="text-white">{state.externalEmail}</span></p>
              {state.tempPassword && (
                <p className="text-ena-light">Geçici şifre: <span className="text-amber-300 font-mono">{state.tempPassword}</span></p>
              )}
            </div>
          )}
          <button
            onClick={() => { window.location.href = state.redirectTo; }}
            className="w-full py-2.5 rounded-lg bg-ena-primary text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            {label} Giriş Ekranına Git <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "ready") {
    return (
      <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-ena-card p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto text-green-400" size={40} />
          <h1 className="text-xl font-bold text-white">{label} Hesabı Tanındı</h1>
          <p className="text-sm text-ena-light">Bağlı hesabınız bulundu. {label} giriş ekranına yönlendiriliyorsunuz...</p>
          <Loader2 className="animate-spin mx-auto text-ena-primary" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-ena-card p-8 text-center space-y-4">
        <ShieldAlert className="mx-auto text-red-400" size={40} />
        <h1 className="text-xl font-bold text-white">Hata</h1>
        <p className="text-sm text-ena-light">{state.message}</p>
        <button onClick={() => router.push("/")} className="text-sm text-ena-primary">Ana Sayfaya Dön</button>
      </div>
    </div>
  );
}
