import Link from "next/link";
import { ArrowRight, Banknote, Clock, FileText, Package2, Receipt, ShieldCheck } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const moduleKey = firstValue(params.module);
  const planKey = firstValue(params.plan);
  const paymentId = firstValue(params.paymentId);
  const isOrder = moduleKey === "B2B_ORDER";
  const title = isOrder ? "Siparişiniz ödeme onayında" : "Ödeme bekleniyor";
  const description = isOrder
    ? "Sipariş kaydı oluştu. Havale/EFT veya manuel ödeme onayı tamamlanınca siparişiniz işleme alınacak."
    : "Başvurunuz alındı. Ödeme onaylandıktan sonra ilgili erişim veya modül otomatik açılacak.";
  const detailHref = isOrder && planKey ? `/dealer/orders/${planKey}` : "/dealer/profile";
  const detailLabel = isOrder ? "Sipariş Detayına Git" : "Profilime Git";

  return (
    <div className="min-h-screen bg-ena-dark px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-ena-border bg-ena-card/55 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10">
            <Banknote size={28} className="text-amber-400" />
          </div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ena-border bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ena-light/60">
            <Clock size={13} />
            Onay bekleniyor
          </p>
          <h1 className="text-3xl font-black tracking-tight text-ena-text md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ena-light/75">{description}</p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-ena-border bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/45">İşlem türü</p>
              <p className="mt-2 text-base font-semibold text-ena-text">
                {isOrder ? "B2B Siparişi" : moduleKey || "Ödeme talebi"}
              </p>
            </div>
            <div className="rounded-3xl border border-ena-border bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/45">Referans</p>
              <p className="mt-2 break-all text-base font-semibold text-ena-text">
                {paymentId || planKey || "Hazırlanıyor"}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-ena-border bg-black/15 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ena-text">
              <Receipt size={16} className="text-ena-primary" />
              Sonraki adımlar
            </div>
            <div className="mt-4 space-y-3 text-sm text-ena-light/75">
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ena-primary/15 text-xs font-bold text-ena-primary">
                  1
                </span>
                <p>Ödeme kaydı açık tutulur ve admin onayı veya ödeme doğrulaması beklenir.</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ena-primary/15 text-xs font-bold text-ena-primary">
                  2
                </span>
                <p>Havale yaptıysanız dekont yükleyin. Kartla ödediyseniz callback sonrası ekran sizi otomatik sipariş detayına taşır.</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ena-primary/15 text-xs font-bold text-ena-primary">
                  3
                </span>
                <p>Onay tamamlanınca sipariş ya da modül lisansı aktif duruma geçirilir.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={detailHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-ena-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {detailLabel} <ArrowRight size={14} />
            </Link>
            <Link
              href="/dealer/payments"
              className="inline-flex items-center gap-2 rounded-2xl border border-ena-border bg-transparent px-5 py-3 text-sm font-semibold text-ena-text transition hover:border-ena-text/25"
            >
              Ödeme Geçmişi
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-ena-border bg-ena-card/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-ena-text">
              <ShieldCheck size={16} className="text-emerald-400" />
              Operasyon notu
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ena-light/75">
              Bu ekran artık sadece genel bir bekleme mesajı değil. Sipariş veya modül bazlı referansı saklar, kullanıcıyı doğru detaya geri götürür.
            </p>
          </div>

          <div className="rounded-[28px] border border-ena-border bg-ena-card/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-ena-text">
              {isOrder ? <Package2 size={16} className="text-amber-400" /> : <FileText size={16} className="text-sky-400" />}
              Hızlı bilgi
            </div>
            <div className="mt-4 space-y-3 text-sm text-ena-light/75">
              <p>Onay süresi normalde 24 saat icinde tamamlanir.</p>
              <p>Dekont eksikse manuel odemeler otomatik tamamlanmaz.</p>
              <p>Destek ekibi gerekli oldugunda referans olarak odeme ID veya plan ID kullanabilir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
