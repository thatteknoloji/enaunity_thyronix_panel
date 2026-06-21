"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerDealerShell } from "@/components/partners/PartnerDealerShell";

const TYPES = [
  { id: "PROFESSIONAL_DEALER", label: "Profesyonel Bayi", desc: "Vergi levham var — ürün alır/satarım" },
  { id: "SOCIAL_DEALER", label: "Sosyal Bayi", desc: "Referans ile bayi kazandırır, komisyon kazanırım" },
  { id: "POD_CREATOR", label: "POD Creator", desc: "Tasarım / grafik / AI artist" },
  { id: "AI_PARTNER", label: "AI Partner", desc: "LinkSlash, HIVE, Thyronix modül satışı" },
];

export default function DealerPartnerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    requestedType: "SOCIAL_DEALER",
    hasTaxPlate: false,
    socialMedia: "",
    applicationNote: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const r = await fetch("/api/dealer/partner/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setLoading(false);
    if (!d.success) {
      setError(d.error || "Başvuru başarısız");
      return;
    }
    router.push("/dealer/partner");
  }

  return (
    <PartnerDealerShell title="Partner Başvurusu" description="EnaUnity Bayi Ağına katılın">
      <form onSubmit={submit} className="rounded-xl border border-ena-border bg-ena-card p-5 space-y-4 max-w-lg">
        <label className="block text-sm text-ena-light">
          Ad Soyad / Firma *
          <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" />
        </label>
        <label className="block text-sm text-ena-light">
          Firma ünvanı
          <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" />
        </label>
        <label className="block text-sm text-ena-light">
          E-posta
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" placeholder="Boş bırakılırsa hesap e-postası" />
        </label>
        <label className="block text-sm text-ena-light">
          Telefon
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" />
        </label>
        <fieldset>
          <legend className="text-sm text-ena-light mb-2">Partner tipi *</legend>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label key={t.id} className="flex items-start gap-2 rounded-lg border border-ena-border p-3 cursor-pointer has-[:checked]:border-cyan-500/40">
                <input type="radio" name="type" value={t.id} checked={form.requestedType === t.id} onChange={() => setForm({ ...form, requestedType: t.id })} className="mt-1" />
                <span><span className="text-white text-sm font-medium">{t.label}</span><br /><span className="text-xs text-ena-light">{t.desc}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-ena-light">
          <input type="checkbox" checked={form.hasTaxPlate} onChange={(e) => setForm({ ...form, hasTaxPlate: e.target.checked })} />
          Vergi levham var
        </label>
        <label className="block text-sm text-ena-light">
          Sosyal medya
          <input value={form.socialMedia} onChange={(e) => setForm({ ...form, socialMedia: e.target.value })} placeholder="@kullanici veya profil linki" className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" />
        </label>
        <label className="block text-sm text-ena-light">
          Başvuru notu
          <textarea value={form.applicationNote} onChange={(e) => setForm({ ...form, applicationNote: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Gönderiliyor…" : "Başvuruyu Gönder"}
        </button>
      </form>
    </PartnerDealerShell>
  );
}
