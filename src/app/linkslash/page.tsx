import Link from "next/link";

export default function LinkSlashLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1117] to-[#1a1d29] text-white">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-sm uppercase tracking-widest text-cyan-400 mb-3">ENAUNITY Modülü</p>
        <h1 className="text-4xl md:text-5xl font-black mb-4">LinkSlash</h1>
        <p className="text-lg text-white/70 mb-8">
          WhatsApp, sosyal medya ve tarayıcı yer imlerinden biriken linkleri AI ile düzenleyen kişisel dijital kütüphaneniz.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/gateway/linkslash"
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400"
          >
            Bayi Girişi
          </Link>
          <Link
            href="/payment/checkout?moduleKey=LINKSLASH&planKey=starter"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/5"
          >
            Lisans Al
          </Link>
        </div>
      </div>
    </div>
  );
}
