"use client";

import { useState } from "react";
import Link from "next/link";
import { Rocket, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { OnboardingWizard } from "@/components/thyronix/OnboardingWizard";

const STEPS = [
  { n: 1, title: "Firma bilgilerini doğrula", time: "2 dk" },
  { n: 2, title: "Kaynak türünü seç (XML / CSV / API)", time: "3 dk" },
  { n: 3, title: "İlk kaynağı bağla", time: "5 dk" },
  { n: 4, title: "Feed yapılandır", time: "3 dk" },
  { n: 5, title: "Yayına al", time: "2 dk" },
];

export default function GettingStartedPage() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-8">
      <OnboardingWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onComplete={() => setWizardOpen(false)} />

      <div className="rounded-2xl border border-nexa-border bg-gradient-to-br from-nexa-primary/5 to-nexa-card p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-nexa-primary/15 flex items-center justify-center shrink-0">
            <Rocket size={24} className="text-nexa-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-nexa-text">15 Dakikada İlk Feediniz</h1>
            <p className="text-sm text-nexa-text-secondary mt-2 max-w-xl">
              THYRONIX hoş geldiniz sihirbazı ile kaynak ekleyin, ürünleri senkronize edin ve ilk feedinizi yayınlayın.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-nexa-text-secondary">
              <Clock size={14} /> Tahmini süre: 15 dakika
            </div>
            <button
              onClick={() => setWizardOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexa-primary text-white text-sm font-semibold"
            >
              Sihirbazı Başlat <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6">
        <h2 className="font-semibold text-nexa-text mb-4">Adımlar</h2>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-center gap-4 p-4 rounded-lg border border-nexa-border">
              <span className="w-8 h-8 rounded-full bg-nexa-primary/10 text-nexa-primary flex items-center justify-center text-sm font-bold">{s.n}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-nexa-text">{s.title}</p>
                <p className="text-xs text-nexa-text-secondary">{s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { href: "/thyronix/sources", label: "Kaynak Ekle" },
          { href: "/thyronix/feeds", label: "Feed Merkezi" },
          { href: "/thyronix/checklist", label: "Kontrol Listesi" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border border-nexa-border bg-nexa-card p-5 hover:border-nexa-primary/30 transition-colors">
            <CheckCircle2 size={18} className="text-nexa-primary mb-2" />
            <p className="text-sm font-medium text-nexa-text">{l.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
