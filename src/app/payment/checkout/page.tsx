"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { PaymentCheckoutPanel } from "@/components/payments/PaymentCheckoutPanel";

interface CheckoutContext {
  type: "module" | "package";
  title: string;
  description?: string;
  amount: number;
  currency: string;
  moduleKey?: string;
  planKey?: string;
  packageId?: string;
}

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const type = params.get("type");
  const moduleKey = params.get("moduleKey");
  const planKey = params.get("planKey");
  const packageId = params.get("packageId");

  useEffect(() => {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (moduleKey) qs.set("moduleKey", moduleKey);
    if (planKey) qs.set("planKey", planKey);
    if (packageId) qs.set("packageId", packageId);

    fetch(`/api/payments/checkout-context?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          if (d.error?.includes("Yetkisiz") || d.error?.includes("Giriş")) {
            router.push(`/auth/login?redirect=/payment/checkout?${qs}`);
            return;
          }
          setError(d.error || "Ödeme bilgisi yüklenemedi");
          return;
        }
        setCtx(d.data);
      })
      .catch(() => setError("Bağlantı hatası"))
      .finally(() => setLoading(false));
  }, [type, moduleKey, planKey, packageId, router]);

  const handleConfirm = async (paymentMethod: string, installmentCount: number) => {
    if (!ctx) return;
    setSubmitting(true);
    setError("");
    try {
      if (ctx.type === "module") {
        const res = await fetch("/api/dealer/modules/purchase-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKey: ctx.moduleKey,
            planKey: ctx.planKey,
            paymentMethod,
            installmentCount,
          }),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || "Ödeme başlatılamadı");
        if (d.data?.redirectUrl) {
          window.location.href = d.data.redirectUrl;
          return;
        }
        router.push(
          `/payment/pending?module=${ctx.moduleKey}&plan=${ctx.planKey}&paymentId=${d.data.paymentId}`,
        );
        return;
      }

      const res = await fetch("/api/product-library/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: ctx.packageId, paymentMethod, installmentCount }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Ödeme başlatılamadı");
      if (d.data?.redirectUrl) {
        window.location.href = d.data.redirectUrl;
        return;
      }
      toast.success(d.data?.free ? "Ücretsiz paket erişiminiz açıldı" : "Ödeme talebiniz alındı");
      router.push("/dealer/product-library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ödeme hatası");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ChevronLeft size={16} /> Geri
        </Link>

        {error && !ctx ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : ctx ? (
          <>
            {ctx.description && (
              <p className="text-sm text-gray-500 mb-4">{ctx.description}</p>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{error}</div>
            )}
            <PaymentCheckoutPanel
              amount={ctx.amount}
              currency={ctx.currency}
              title={ctx.title}
              loading={submitting}
              onConfirm={handleConfirm}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
