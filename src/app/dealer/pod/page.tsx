import Link from "next/link";

export default function DealerPodPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">POD Creator</h1>
      <p className="text-ena-light text-sm mb-6">Print-on-Demand mağazanız — Faz 0 altyapı</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dealer/pod/store" className="rounded-xl border border-ena-border bg-ena-card p-6 text-center hover:border-cyan-500/40">Mağazam</Link>
        <Link href="/dealer/pod/designs" className="rounded-xl border border-ena-border bg-ena-card p-6 text-center hover:border-cyan-500/40">Tasarımlarım</Link>
      </div>
    </div>
  );
}
