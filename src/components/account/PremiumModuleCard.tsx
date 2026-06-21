"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { CustomerProductCard } from "@/lib/customer-products/types";
import { PRODUCT_META } from "@/lib/customer-products/types";
import { AccCard } from "./AccountShell";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  TRIAL: "Deneme",
  PENDING: "Onay Bekliyor",
  INACTIVE: "Satın Al",
  EXPIRED: "Süresi Doldu",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "acc-badge-success",
  TRIAL: "acc-badge-info",
  PENDING: "acc-badge-warning",
  INACTIVE: "acc-badge-neutral",
  EXPIRED: "acc-badge-danger",
};

export function PremiumModuleCard({ product }: { product: CustomerProductCard }) {
  const meta = PRODUCT_META[product.moduleKey];
  const canOpen = product.status === "ACTIVE" || product.status === "TRIAL";

  return (
    <AccCard interactive className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ena-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ena-light">Premium Modül</p>
            <h3 className="text-lg font-bold text-ena-text mt-0.5">{product.label}</h3>
            <p className="text-xs text-ena-light mt-1 line-clamp-2">{product.description}</p>
          </div>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_CLASS[product.status]}`}>
            {STATUS_LABEL[product.status]}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-ena-light/60">Paket</dt>
            <dd className="text-ena-text font-medium mt-0.5">{product.planName || "—"}</dd>
          </div>
          <div>
            <dt className="text-ena-light/60">Son Giriş</dt>
            <dd className="text-ena-text font-medium mt-0.5">
              {product.lastLoginAt ? new Date(product.lastLoginAt).toLocaleDateString("tr-TR") : "—"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={
              canOpen
                ? product.moduleKey === "LINKSLASH"
                  ? meta.gatewayPath
                  : meta.appPath
                : meta.pricingPath
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ena-primary text-ena-dark text-xs font-semibold hover:brightness-95 transition-all"
          >
            {canOpen ? <ArrowRight size={14} /> : <ExternalLink size={14} />}
            {canOpen ? "Aç" : "Satın Al"}
          </Link>
          <Link href={`/products/licenses?module=${product.moduleKey}`} className="acc-input !w-auto px-3 py-2 text-xs font-medium inline-flex items-center">
            Detay
          </Link>
          <Link href={meta.pricingPath} className="acc-input !w-auto px-3 py-2 text-xs font-medium inline-flex items-center">
            Paketler
          </Link>
        </div>
      </div>
    </AccCard>
  );
}

export function OnboardingProgress({ approval }: { approval?: { status?: string; documentStatus?: string; paymentStatus?: string } | null }) {
  const steps = [
    { key: "profile", label: "Profil", done: !!approval },
    { key: "docs", label: "Evrak", done: approval?.documentStatus === "APPROVED", pending: approval?.documentStatus === "PENDING" },
    { key: "pay", label: "Ödeme", done: approval?.paymentStatus === "PAID", pending: approval?.paymentStatus === "PENDING" },
    { key: "review", label: "Admin Onayı", done: approval?.status === "ACTIVE", pending: ["PENDING_ADMIN_APPROVAL", "PENDING_APPROVAL"].includes(approval?.status || "") },
    { key: "active", label: "Aktif Bayi", done: approval?.status === "ACTIVE" },
  ];

  return (
    <AccCard>
      <h3 className="text-sm font-semibold text-ena-text mb-4">Bayi Onboarding</h3>
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const state = step.done ? "done" : step.pending ? "pending" : "idle";
          return (
            <div key={step.key} className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    state === "done" ? "bg-nexa-success" : state === "pending" ? "bg-nexa-warning" : "bg-ena-gray/50"
                  }`}
                />
                {i < steps.length - 1 && <div className="w-1 shrink-0" />}
              </div>
              <p className={`text-[10px] mt-2 truncate font-medium ${
                state === "done" ? "text-nexa-success" : state === "pending" ? "text-nexa-warning" : "text-ena-light/50"
              }`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </AccCard>
  );
}
