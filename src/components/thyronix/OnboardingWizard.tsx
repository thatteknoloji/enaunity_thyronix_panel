"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Database, Radio, Upload, CheckCircle2, ArrowRight, X } from "lucide-react";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, title: "Firma", icon: Building2, desc: "Firma bilgilerinizi doğrulayın" },
  { id: 2, title: "Kaynak Türü", icon: Database, desc: "XML, CSV, Excel veya API seçin" },
  { id: 3, title: "Bağlantı", icon: Upload, desc: "İlk kaynağınızı ekleyin" },
  { id: 4, title: "İlk Feed", icon: Radio, desc: "Feed yapılandırmasını tamamlayın" },
  { id: 5, title: "Yayın", icon: CheckCircle2, desc: "Feedinizi yayına alın" },
];

type Props = {
  open: boolean;
  initialStep?: number;
  onClose: () => void;
  onComplete: () => void;
};

export function OnboardingWizard({ open, initialStep = 1, onClose, onComplete }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [company, setCompany] = useState("");
  const [sourceType, setSourceType] = useState("xml");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [feedName, setFeedName] = useState("Ana Feed");
  const [channel, setChannel] = useState("trendyol");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const saveProgress = async (patch: Record<string, unknown>) => {
    await fetch("/api/thyronix/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const finish = async () => {
    setSaving(true);
    try {
      await saveProgress({ onboardingCompleted: true, onboardingStep: 5, checklist: { wizardDone: true } });
      toast.success("Hoş geldiniz! THYRONIX hazır.");
      onComplete();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const createSourceAndFeed = async () => {
    setSaving(true);
    try {
      const srcRes = await fetch("/api/thyronix/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sourceName || "İlk Kaynak", xmlUrl: sourceUrl, type: sourceType }),
      });
      const srcData = await srcRes.json();
      if (!srcData.success) {
        toast.error(srcData.error || "Kaynak oluşturulamadı");
        return;
      }
      const feedRes = await fetch("/api/thyronix/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: feedName, channel, outputFormat: "jetteknoloji" }),
      });
      const feedData = await feedRes.json();
      if (!feedData.success) {
        toast.error(feedData.error || "Feed oluşturulamadı");
        return;
      }
      if (srcData.data?.id) {
        await fetch(`/api/thyronix/sources/${srcData.data.id}/sync`, { method: "POST" });
      }
      if (feedData.data?.id) {
        await fetch("/api/thyronix/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedId: feedData.data.id }),
        });
      }
      await saveProgress({
        onboardingStep: 5,
        onboarding: { company, sourceType, sourceId: srcData.data?.id, feedId: feedData.data?.id },
      });
      setStep(5);
      toast.success("Kaynak ve feed oluşturuldu!");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-nexa-border bg-nexa-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-nexa-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-nexa-primary">Hoş Geldiniz</p>
            <h2 className="text-lg font-bold text-nexa-text">THYRONIX Kurulum Sihirbazı</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-nexa-hover text-nexa-text-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full ${step >= s.id ? "bg-nexa-primary" : "bg-nexa-border"}`}
            />
          ))}
        </div>

        <div className="p-6 min-h-[320px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-nexa-text">Firma bilgileri</h3>
              <input
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-4 py-2.5 text-sm text-nexa-text"
                placeholder="Firma adı"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-nexa-text">Kaynak türü seçin</h3>
              {["xml", "csv", "excel", "api"].map((t) => (
                <button
                  key={t}
                  onClick={() => setSourceType(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium uppercase ${
                    sourceType === t ? "border-nexa-primary bg-nexa-primary/10 text-nexa-primary" : "border-nexa-border text-nexa-text-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-nexa-text">İlk kaynağınız</h3>
              <input
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-4 py-2.5 text-sm"
                placeholder="Kaynak adı"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-4 py-2.5 text-sm"
                placeholder="URL (XML/CSV/Excel)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-nexa-text">İlk feed</h3>
              <input
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-4 py-2.5 text-sm"
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
              />
              <select
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-4 py-2.5 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="trendyol">Trendyol</option>
                <option value="hepsiburada">Hepsiburada</option>
                <option value="n11">N11</option>
                <option value="custom">Özel</option>
              </select>
            </div>
          )}
          {step === 5 && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-nexa-success mb-4" />
              <h3 className="text-xl font-bold text-nexa-text">Kurulum tamamlandı!</h3>
              <p className="text-sm text-nexa-text-secondary mt-2">Feed merkezinden yayınınızı yönetebilirsiniz.</p>
              <Link href="/thyronix/feeds" className="inline-flex mt-4 text-sm text-nexa-primary hover:underline">
                Feed Merkezine Git
              </Link>
            </div>
          )}
        </div>

        <div className="flex justify-between px-6 py-4 border-t border-nexa-border bg-nexa-bg/50">
          <button
            disabled={step <= 1 || saving}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 text-sm text-nexa-text-secondary disabled:opacity-40"
          >
            Geri
          </button>
          {step < 4 && (
            <button
              onClick={async () => {
                await saveProgress({ onboardingStep: step + 1, onboarding: { company, sourceType } });
                setStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-nexa-primary text-white text-sm font-semibold"
            >
              İleri <ArrowRight size={14} />
            </button>
          )}
          {step === 4 && (
            <button
              disabled={saving || !sourceUrl}
              onClick={createSourceAndFeed}
              className="px-5 py-2 rounded-xl bg-nexa-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Oluşturuluyor..." : "Oluştur ve Devam"}
            </button>
          )}
          {step === 5 && (
            <button
              disabled={saving}
              onClick={finish}
              className="px-5 py-2 rounded-xl bg-nexa-success text-white text-sm font-semibold"
            >
              Bitir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
