"use client";

import { useEffect, useState } from "react";
import { Brain, Save, Wifi } from "lucide-react";
import toast from "react-hot-toast";

const PROVIDERS = [
  { v: "openai", l: "OpenAI (ChatGPT)", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { v: "deepseek", l: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { v: "grok", l: "Grok (xAI)", models: ["grok-2-latest", "grok-2-1212", "grok-beta"] },
  { v: "claude", l: "Claude (Anthropic)", models: ["claude-3-sonnet-20240229", "claude-3-haiku-20240307"] },
  { v: "gemini", l: "Gemini (Google)", models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
  { v: "openrouter", l: "OpenRouter", models: ["openai/gpt-4o", "deepseek/deepseek-chat", "x-ai/grok-2"] },
  { v: "custom", l: "Özel OpenAI-Compatible API", models: [] },
  { v: "ollama", l: "Ollama (Yerel)", models: ["llama3", "mistral"] },
];

export function ThyronixMyAiProviderPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    name: "Benim AI Sağlayıcım",
    provider: "openai",
    apiKey: "",
    endpoint: "",
    model: "gpt-4o",
    configured: false,
    hasApiKey: false,
  });

  const load = () => {
    fetch("/api/thyronix/ai/my-provider")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        if (d.data.isAdmin) {
          setIsAdmin(true);
          return;
        }
        setForm((f) => ({
          ...f,
          name: d.data.name || f.name,
          provider: d.data.provider || "openai",
          model: d.data.model || "gpt-4o",
          endpoint: d.data.endpoint || "",
          configured: d.data.configured,
          hasApiKey: d.data.hasApiKey,
        }));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (testConnection: boolean) => {
    setSaving(true);
    try {
      const r = await fetch("/api/thyronix/ai/my-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, testConnection }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Kayıt başarısız");
      toast.success(testConnection ? "API bağlantısı başarılı — tüm AI işleri bu anahtarla çalışır" : "AI sağlayıcı kaydedildi");
      setForm((f) => ({ ...f, apiKey: "", configured: true, hasApiKey: true }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-nexa-text-secondary">Yükleniyor…</p>;

  if (isAdmin) {
    return (
      <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 text-sm text-nexa-text-secondary">
        Platform admin olarak tüm AI sağlayıcılarını{" "}
        <a href="/thyronix/ai" className="text-nexa-primary hover:underline">THYRONIX AI → Sağlayıcılar</a>{" "}
        sekmesinden yönetirsiniz. OpenAI, DeepSeek, Claude, Gemini ve özel endpoint desteklenir.
      </div>
    );
  }

  const models = PROVIDERS.find((p) => p.v === form.provider)?.models || [];

  return (
    <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-nexa-text flex items-center gap-2">
          <Brain size={18} className="text-nexa-primary" />
          Yapay Zeka API (BYOK)
        </h2>
        <p className="text-xs text-nexa-text-secondary mt-1">
          Kendi OpenAI, DeepSeek, Grok veya uyumlu API anahtarınızı girin — başlık optimizasyonu, açıklama üretimi, bulk AI ve tüm Thyronix AI işleri bu anahtar üzerinden çalışır.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Sağlayıcı adı"
          className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
        />
        <select
          value={form.provider}
          onChange={(e) => {
            const p = PROVIDERS.find((x) => x.v === e.target.value);
            setForm({ ...form, provider: e.target.value, model: p?.models?.[0] || "" });
          }}
          className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
        >
          {PROVIDERS.map((p) => (
            <option key={p.v} value={p.v}>{p.l}</option>
          ))}
        </select>
      </div>

      <input
        type="password"
        value={form.apiKey}
        onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        placeholder={form.hasApiKey ? "Yeni API key (boş bırak = mevcut kalsın)" : "API Key (sk-... / sk-or-...)"}
        className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
      />

      {(form.provider === "custom" || form.provider === "openrouter") && (
        <input
          value={form.endpoint}
          onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          placeholder="API Endpoint URL"
          className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
        />
      )}

      <select
        value={form.model}
        onChange={(e) => setForm({ ...form, model: e.target.value })}
        className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
      >
        {models.length ? models.map((m) => <option key={m} value={m}>{m}</option>) : (
          <option value={form.model}>{form.model || "model"}</option>
        )}
      </select>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => save(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-nexa-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          <Wifi size={14} /> {saving ? "Test ediliyor…" : "Kaydet ve Test Et"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => save(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-nexa-border px-4 py-2 text-sm disabled:opacity-50"
        >
          <Save size={14} /> Kaydet
        </button>
      </div>

      {form.configured && (
        <p className="text-xs text-emerald-600">✓ AI sağlayıcı aktif — tüm Thyronix AI görevleri bu API üzerinden çalışacak.</p>
      )}
    </div>
  );
}
