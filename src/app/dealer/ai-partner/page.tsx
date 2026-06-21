"use client";

import { useState } from "react";

const TASKS = [
  { id: "product_description", label: "Ürün açıklaması üret" },
  { id: "seo_title", label: "SEO başlığı üret" },
  { id: "category_suggest", label: "Kategori öner" },
  { id: "social_post", label: "Sosyal medya metni" },
  { id: "trend_product_idea", label: "Trend ürün fikri" },
  { id: "pod_design_brief", label: "POD tasarım briefi" },
] as const;

export default function DealerAiPartnerPage() {
  const [task, setTask] = useState<string>("product_description");
  const [productName, setProductName] = useState("");
  const [output, setOutput] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setOutput("");
    const r = await fetch("/api/ai-partner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, context: { productName, niche: "dekorasyon" } }),
    });
    const d = await r.json();
    setLoading(false);
    if (d.success) {
      setOutput(d.data.content);
      setSource(d.data.source);
    } else {
      setOutput(d.error || "Hata");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">AI Partner Merkezi</h1>
      <p className="text-ena-light text-sm mb-6">Ürün, SEO ve içerik üretim asistanı</p>
      <div className="rounded-xl border border-ena-border bg-ena-card p-5 space-y-4">
        <label className="block text-sm text-ena-light">
          Görev
          <select value={task} onChange={(e) => setTask(e.target.value)} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white">
            {TASKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="block text-sm text-ena-light">
          Ürün / bağlam
          <input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white" placeholder="Örn: Cam Tablo 60x90" />
        </label>
        <button type="button" onClick={generate} disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Üretiliyor…" : "Üret"}
        </button>
        {output && (
          <div className="rounded-lg bg-black/30 p-4 text-sm text-ena-light whitespace-pre-wrap">
            {source && <span className="text-xs text-violet-400 block mb-2">Kaynak: {source}</span>}
            {output}
          </div>
        )}
      </div>
    </div>
  );
}
