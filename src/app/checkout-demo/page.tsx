"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock3,
  CreditCard,
  Gauge,
  Info,
  MapPinned,
  PackageSearch,
  Sparkles,
  Truck,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

const steps = [
  {
    title: "Platform seçimi",
    text: "Trendyol, Hepsiburada, N11 ya da kendi siteniz. Kargo davranışı burada belirlenir.",
  },
  {
    title: "Adres çekimi",
    text: "Bayi adresi profilden otomatik gelir. Kayıt yoksa ilk siparişte kayıt edilir.",
  },
  {
    title: "Ödeme",
    text: "Cari, havale veya kart. Seçim anında özet kartı sağda güncellenir.",
  },
  {
    title: "Onay",
    text: "Sipariş, güvenli şekilde tek bir akışta tamamlanır. Boşluklar bilgiye dönüşür.",
  },
];

const orderLines = [
  { name: "Cam tablo 25 x 35", qty: 1, price: 249 },
  { name: "Mdf baskı 40 x 60", qty: 2, price: 189 },
  { name: "Koruma köpüğü", qty: 1, price: 34 },
];

const workflowNotes = [
  "Adresler profilinizden gelir.",
  "Eksik alanlar ilk siparişte kaydedilir.",
  "Bayi değişiklikleri profil bölümünden yapılır.",
  "Ödeme paneli yalnızca gerekli ise görünür.",
];

export default function CheckoutDemoPage() {
  const subtotal = orderLines.reduce((sum, item) => sum + item.qty * item.price, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-ena-primary/12 blur-3xl" />
        <div className="absolute left-[-8rem] top-[14rem] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-6rem] bottom-[-4rem] h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Gerçek checkout
          </Link>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Demo önizleme
          </span>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ena-primary/20 bg-ena-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ena-primary">
                <Sparkles size={12} />
                Checkout demo
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-[0.95] tracking-tight text-white md:text-5xl">
                Boşlukları bilgiye çeviren üç kolonlu onay akışı
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/72 md:text-base">
                Orta bölüm aynı kalır. Sol tarafta akış, sağ tarafta canlı özet. Kullanıcı nerede olduğunu, neyin eksik olduğunu ve ne ödeyeceğini tek bakışta görür.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Akış</p>
                <p className="mt-1 text-sm font-semibold text-white">Net ve sakin</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Adres</p>
                <p className="mt-1 text-sm font-semibold text-white">Profilden çekilir</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Ödeme</p>
                <p className="mt-1 text-sm font-semibold text-white">Sağ panelde görünür</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.45 }}
            className="space-y-4"
          >
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                <Gauge size={14} />
                Akış rehberi
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ena-primary/15 text-sm font-bold text-ena-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                <Info size={14} />
                Neden bu alanlar
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                {workflowNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2">
                    <BadgeCheck size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>

          <motion.main
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Merkez alan</p>
                <h2 className="mt-1 text-lg font-bold text-white">Onay formu</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
                <PackageSearch size={14} />
                Form aynı kalır
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MapPinned size={16} className="text-ena-primary" />
                  <h3 className="font-semibold text-white">Firma ve adres</h3>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Firma adı</p>
                    <p className="mt-1 text-sm font-medium text-white/85">ENA Demo Ltd.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Fatura adresi</p>
                    <p className="mt-1 text-sm font-medium text-white/85">Adres profilden çekildi</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Teslimat adresi</p>
                    <p className="mt-1 text-sm font-medium text-white/85">Gerekiyorsa ilk siparişte kayıt edilir</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-300" />
                  <h3 className="font-semibold text-white">Ödeme ve durum</h3>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Yöntem</p>
                    <p className="mt-1 text-sm font-medium text-white/85">Cari / Havale / Kart</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Durum</p>
                    <p className="mt-1 text-sm font-medium text-white/85">Kredi limiti açıklaması sadeleşmiş durumda</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Akış notu</p>
                    <p className="mt-1 text-sm font-medium text-white/85">Ödeme paneli gerektiğinde sağ kolona taşınabilir</p>
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-5 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Truck size={16} className="text-cyan-300" />
                <h3 className="font-semibold text-white">Bu blokta ne olur</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  "Kart/ havale seçimi",
                  "Belge ve not ekleri",
                  "Sipariş onay butonu",
                ].map((label) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/75">
                    {label}
                  </div>
                ))}
              </div>
            </section>
          </motion.main>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="space-y-4 xl:sticky xl:top-6"
          >
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                <Clock3 size={14} />
                Canlı özet
              </div>
              <div className="space-y-3">
                {orderLines.map((line) => (
                  <div key={line.name} className="flex items-center justify-between border-b border-white/8 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-white/90">{line.name}</p>
                      <p className="text-xs text-white/45">Adet {line.qty}</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{formatPrice(line.qty * line.price)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Ara toplam</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/70">
                  <span>Kargo</span>
                  <span>{shipping === 0 ? "Bedava" : formatPrice(shipping)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold text-white">
                  <span>Genel toplam</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Kısa not</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Bu demo, orta formu bozmadan yan boşlukları bilgi katmanına çeviren bir düzeni gösterir. İstersen bir sonraki adımda bunu gerçek checkout'a adapte ederim.
              </p>
              <Link
                href="/checkout"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-ena-primary px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98]"
              >
                Gerçek checkout’a dön
                <ChevronRight size={16} />
              </Link>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
