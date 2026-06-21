"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight, Store } from "lucide-react";
import { PartnerDealerShell } from "@/components/partners/PartnerDealerShell";
import type { PartnerApplyContext } from "@/lib/partners/apply-context";

const PARTNER_TYPES = [
  {
    id: "SOCIAL_DEALER",
    label: "Sosyal Bayi",
    desc: "Referans kodu ile bayi kazandırır, komisyon kazanırım",
    kind: "partner" as const,
  },
  {
    id: "PROFESSIONAL_DEALER",
    label: "Profesyonel Bayi",
    desc: "Vergi levham var — ürün alır/satarım, partner komisyonu",
    kind: "partner" as const,
  },
  {
    id: "POD_CREATOR",
    label: "POD Creator Modülü",
    desc: "Tasarımlarını ürüne dönüştür — modül lisansı gerekir",
    kind: "module" as const,
  },
  {
    id: "AI_PARTNER",
    label: "AI Partner",
    desc: "LinkSlash, HIVE, Thyronix modül satışından komisyon",
    kind: "hybrid" as const,
  },
];

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
        ok
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      }`}
    >
      {ok && <CheckCircle2 size={12} />}
      {label}
    </span>
  );
}

export default function DealerPartnerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ctx, setCtx] = useState<PartnerApplyContext | null>(null);
  const [requestedType, setRequestedType] = useState("SOCIAL_DEALER");
  const [applicationNote, setApplicationNote] = useState("");
  const [socialMedia, setSocialMedia] = useState("");

  useEffect(() => {
    fetch("/api/dealer/partner/apply")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setError(d.error || "Bilgiler yüklenemedi");
          return;
        }
        setCtx(d.data);
        setRequestedType(d.data.suggestedPartnerType || "SOCIAL_DEALER");
        setSocialMedia(d.data.prefill.socialMedia || "");
      })
      .catch(() => setError("Bağlantı hatası"))
      .finally(() => setLoading(false));
  }, []);

  const selected = PARTNER_TYPES.find((t) => t.id === requestedType);
  const isModuleIntent = selected?.kind === "module";
  const isHybrid = selected?.kind === "hybrid";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx) return;

    setSubmitting(true);
    setError("");

    const r = await fetch("/api/dealer/partner/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedType,
        intent: isModuleIntent ? "module" : "partner",
        applicationNote,
        socialMedia: ctx.isApprovedDealer ? socialMedia : undefined,
        ...(ctx.isApprovedDealer
          ? {}
          : {
              fullName: ctx.prefill.fullName,
              companyName: ctx.prefill.companyName,
              email: ctx.prefill.email,
              phone: ctx.prefill.phone,
              hasTaxPlate: ctx.prefill.hasTaxPlate,
            }),
      }),
    });
    const d = await r.json();
    setSubmitting(false);

    if (!d.success) {
      setError(d.error || "İşlem başarısız");
      return;
    }

    if (d.redirectTo) {
      router.push(d.redirectTo);
      return;
    }

    router.push("/dealer/partner");
  }

  if (loading) {
    return (
      <PartnerDealerShell title="Partner Başvurusu" description="Yükleniyor…">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-cyan-400" size={28} />
        </div>
      </PartnerDealerShell>
    );
  }

  if (ctx?.partnerProfile?.status === "ACTIVE") {
    return (
      <PartnerDealerShell title="Partner Merkezi" description="Zaten aktif partner profiliniz var">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-3">
          <p className="text-sm text-ena-light">
            Partner profiliniz aktif. Yeni modül lisansı için Modül Pazarı&apos;nı kullanın — tekrar başvuru gerekmez.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dealer/partner"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Partner Merkezi <ArrowRight size={14} />
            </Link>
            <Link
              href="/dealer/modules"
              className="inline-flex items-center gap-2 rounded-lg border border-ena-border px-4 py-2 text-sm text-white hover:bg-ena-card"
            >
              <Store size={14} /> Modül Pazarı
            </Link>
          </div>
        </div>
      </PartnerDealerShell>
    );
  }

  if (ctx?.pendingApplication) {
    return (
      <PartnerDealerShell title="Partner Başvurusu" description="Başvurunuz değerlendiriliyor">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-amber-200 text-sm">
            {new Date(ctx.pendingApplication.createdAt).toLocaleDateString("tr-TR")} tarihli partner başvurunuz admin
            onayı bekliyor.
          </p>
          <Link href="/dealer/partner" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
            Partner Merkezi&apos;ne dön
          </Link>
        </div>
      </PartnerDealerShell>
    );
  }

  return (
    <PartnerDealerShell
      title={ctx?.isApprovedDealer ? "Partner / Modül Talebi" : "Partner Başvurusu"}
      description={
        ctx?.isApprovedDealer
          ? "Onaylı bayi hesabınız var — bilgileriniz kayıtlı, sadece talep ettiğiniz programı seçin"
          : "EnaUnity Bayi Ağına katılın"
      }
    >
      {ctx?.isApprovedDealer && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 mb-5 space-y-3">
          <p className="text-sm text-green-200 font-medium">Kayıtlı bayi bilgileriniz</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm text-ena-light">
            <div>
              <span className="text-xs uppercase text-ena-light/60">Ad / Firma</span>
              <p className="text-white">{ctx.prefill.fullName}</p>
              {ctx.prefill.companyName && <p>{ctx.prefill.companyName}</p>}
            </div>
            <div>
              <span className="text-xs uppercase text-ena-light/60">İletişim</span>
              <p>{ctx.prefill.email}</p>
              <p>{ctx.prefill.phone || "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge ok={ctx.approvalStatus === "ACTIVE"} label="Bayi onayı" />
            <StatusBadge ok={ctx.documentStatus === "APPROVED"} label="Evraklar" />
            <StatusBadge ok={ctx.paymentStatus === "PAID"} label="Ödeme" />
          </div>
          <p className="text-xs text-ena-light/70">
            Evrak ve firma bilgilerinizi tekrar girmenize gerek yok. Eksik evrak varsa{" "}
            <Link href="/dealer/profile" className="text-cyan-400 hover:underline">
              profil sayfasından
            </Link>{" "}
            ekleyebilirsiniz.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border border-ena-border bg-ena-card p-5 space-y-4 max-w-lg">
        {!ctx?.isApprovedDealer && (
          <>
            <label className="block text-sm text-ena-light">
              Ad Soyad / Firma *
              <input
                required
                value={ctx?.prefill.fullName || ""}
                onChange={(e) =>
                  setCtx((c) =>
                    c ? { ...c, prefill: { ...c.prefill, fullName: e.target.value } } : c
                  )
                }
                className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-ena-light">
              Firma ünvanı
              <input
                value={ctx?.prefill.companyName || ""}
                onChange={(e) =>
                  setCtx((c) =>
                    c ? { ...c, prefill: { ...c.prefill, companyName: e.target.value } } : c
                  )
                }
                className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-ena-light">
              E-posta
              <input
                type="email"
                value={ctx?.prefill.email || ""}
                onChange={(e) =>
                  setCtx((c) =>
                    c ? { ...c, prefill: { ...c.prefill, email: e.target.value } } : c
                  )
                }
                className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-ena-light">
              Telefon
              <input
                value={ctx?.prefill.phone || ""}
                onChange={(e) =>
                  setCtx((c) =>
                    c ? { ...c, prefill: { ...c.prefill, phone: e.target.value } } : c
                  )
                }
                className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
              />
            </label>
          </>
        )}

        <fieldset>
          <legend className="text-sm text-ena-light mb-2">Ne talep ediyorsunuz? *</legend>
          <div className="space-y-2">
            {PARTNER_TYPES.map((t) => (
              <label
                key={t.id}
                className="flex items-start gap-2 rounded-lg border border-ena-border p-3 cursor-pointer has-[:checked]:border-cyan-500/40"
              >
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={requestedType === t.id}
                  onChange={() => setRequestedType(t.id)}
                  className="mt-1"
                />
                <span>
                  <span className="text-white text-sm font-medium">{t.label}</span>
                  <br />
                  <span className="text-xs text-ena-light">{t.desc}</span>
                  {t.kind === "module" && (
                    <span className="block text-xs text-emerald-400/80 mt-1">
                      → Modül sözleşmesi ve ödeme ekranına yönlendirilirsiniz
                    </span>
                  )}
                  {t.kind === "hybrid" && ctx?.isApprovedDealer && (
                    <span className="block text-xs text-cyan-400/80 mt-1">
                      → Partner profili açılır; modül lisansları Modül Pazarı&apos;ndan alınır
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {!ctx?.isApprovedDealer && (
          <label className="flex items-center gap-2 text-sm text-ena-light">
            <input
              type="checkbox"
              checked={ctx?.prefill.hasTaxPlate || false}
              onChange={(e) =>
                setCtx((c) =>
                  c ? { ...c, prefill: { ...c.prefill, hasTaxPlate: e.target.checked } } : c
                )
              }
            />
            Vergi levham var
          </label>
        )}

        <label className="block text-sm text-ena-light">
          Sosyal medya {ctx?.isApprovedDealer ? "(isteğe bağlı)" : ""}
          <input
            value={socialMedia}
            onChange={(e) => setSocialMedia(e.target.value)}
            placeholder="@kullanici veya profil linki"
            className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm text-ena-light">
          Not {ctx?.isApprovedDealer ? "(isteğe bağlı)" : ""}
          <textarea
            value={applicationNote}
            onChange={(e) => setApplicationNote(e.target.value)}
            rows={2}
            placeholder={ctx?.isApprovedDealer ? "Eklemek istediğiniz bir not varsa yazın" : ""}
            className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white"
          />
        </label>

        {isModuleIntent && ctx && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200/90">
            POD Creator bir modül lisansıdır. Mevcut bayi evraklarınız geçerlidir; yalnızca modül sözleşmesi onayı ve
            ödeme adımına geçeceksiniz.
          </div>
        )}

        {isHybrid && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200/90">
            AI Partner profili referans komisyonu içindir. Modül kullanımı için{" "}
            <Link href="/dealer/modules" className="underline">
              Modül Pazarı
            </Link>
            &apos;ndan ilgili lisansı satın alın.
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> İşleniyor…
            </>
          ) : isModuleIntent ? (
            <>
              Modül Lisansına Git <ArrowRight size={14} />
            </>
          ) : ctx?.isApprovedDealer ? (
            "Partner Profilimi Aktifleştir"
          ) : (
            "Başvuruyu Gönder"
          )}
        </button>
      </form>
    </PartnerDealerShell>
  );
}
