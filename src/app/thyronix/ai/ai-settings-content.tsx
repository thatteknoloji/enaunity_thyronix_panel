"use client";

import { useEffect, useState } from "react";
import { Brain, Plus, Trash2, Save, X, Play, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";

const PROVIDERS = [
  { v: "openai", l: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { v: "claude", l: "Claude (Anthropic)", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"] },
  { v: "gemini", l: "Gemini (Google)", models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"] },
  { v: "deepseek", l: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { v: "openrouter", l: "OpenRouter", models: ["openai/gpt-4o", "anthropic/claude-3-sonnet", "google/gemini-pro"] },
  { v: "custom", l: "Custom OpenAI-Compatible", models: [] },
  { v: "ollama", l: "Ollama (Local)", models: ["llama3", "mistral", "gemma2", "phi3"] },
];

export default function ThyronixAiSettingsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", provider: "openai", apiKey: "", endpoint: "", model: "gpt-4o", temperature: 0.7, maxTokens: 4096, systemPrompt: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchProviders = () => {
    fetch("/api/admin/nexa-ai-providers").then(r => r.json()).then(d => { if (d.success) setProviders(d.data); setLoading(false); });
  };
  useEffect(() => { fetchProviders(); }, []);

  const resetForm = () => { setForm({ name: "", provider: "openai", apiKey: "", endpoint: "", model: "gpt-4o", temperature: 0.7, maxTokens: 4096, systemPrompt: "" }); setEditing(null); };

  const handleSelectProvider = (v: string) => {
    const p = PROVIDERS.find(x => x.v === v);
    setForm({ ...form, provider: v, model: (p?.models?.[0] || ""), endpoint: v === "ollama" ? "http://localhost:11434/api/generate" : "" });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("İsim girin");
    setSaving(true);
    const body = { ...form, temperature: Number(form.temperature), maxTokens: Number(form.maxTokens) };
    const res = await fetch(`/api/admin/nexa-ai-providers${editing?.id ? "/" + editing.id : ""}`, {
      method: editing?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) { toast.success(editing?.id ? "Güncellendi" : "Oluşturuldu"); resetForm(); fetchProviders(); } else { toast.error(d.error || "Hata"); }
    setSaving(false);
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    toast.loading("Bağlantı test ediliyor...");
    const res = await fetch(`/api/admin/nexa-ai-providers/${id}`, { method: "POST" });
    const d = await res.json();
    toast.dismiss();
    if (d.success) toast.success("Bağlantı başarılı!");
    else toast.error(d.error || "Bağlantı başarısız");
    setTesting(null);
    fetchProviders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu provider'ı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/nexa-ai-providers/${id}`, { method: "DELETE" });
    toast.success("Silindi"); fetchProviders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2"><Brain size={24} className="text-nexa-primary" /> THYRONIX AI Settings</h1><p className="text-sm text-nexa-text-secondary mt-1">AI provider yapılandırması</p></div>
        <button onClick={() => { resetForm(); setEditing({}); }} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600">
          <Plus size={14} /> Provider Ekle
        </button>
      </div>

      {editing !== null && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-nexa-text">{editing?.id ? "Provider Düzenle" : "Yeni Provider"}</h2>
            <button onClick={resetForm} className="text-nexa-text-secondary hover:text-nexa-text"><X size={16} /></button></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Provider adı (örn: OpenAI Pro)" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50" />
            <select value={form.provider} onChange={e => handleSelectProvider(e.target.value)} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none">
              {PROVIDERS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>

          <input value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder={form.provider === "ollama" ? "Ollama için API anahtarı gerekmez" : "API Key"} type="password" className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50" />

          {(form.provider === "custom" || form.provider === "openrouter") && (
            <input value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })} placeholder="API Endpoint URL" className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {form.provider === "custom" ? (
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Model adı" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm" />
            ) : (
              <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none">
                {(PROVIDERS.find(p => p.v === form.provider)?.models || [form.model]).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <input type="number" value={form.temperature} onChange={e => setForm({ ...form, temperature: Number(e.target.value) })} placeholder="Temperature" step="0.1" min="0" max="2" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm" />
            <input type="number" value={form.maxTokens} onChange={e => setForm({ ...form, maxTokens: Number(e.target.value) })} placeholder="Max Tokens" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm" />
          </div>

          <textarea value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} placeholder="System prompt override (opsiyonel)" rows={2} className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">
            <Save size={14} /> {saving ? "Kaydediliyor..." : editing?.id ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left text-nexa-text-secondary">Provider</th>
            <th className="px-4 py-3 text-left text-nexa-text-secondary hidden md:table-cell">Model</th>
            <th className="px-4 py-3 text-center text-nexa-text-secondary">Durum</th>
            <th className="px-4 py-3 text-right text-nexa-text-secondary hidden md:table-cell">Kullanım</th>
            <th className="px-4 py-3 text-right text-nexa-text-secondary">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr> :
              providers.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Henüz provider eklenmemiş</td></tr> :
                providers.map((p: any) => (
                  <tr key={p.id} className="hover:bg-nexa-hover">
                    <td className="px-4 py-3"><div><p className="font-medium text-nexa-text">{p.name}</p><p className="text-[10px] text-nexa-text-secondary">{p.provider}</p></div></td>
                    <td className="px-4 py-3 hidden md:table-cell text-nexa-text-secondary text-xs">{p.model}</td>
                    <td className="px-4 py-3 text-center">
                      {p.status === "active" ? <span className="text-xs bg-nexa-success/10 text-nexa-success px-2 py-0.5 rounded flex items-center gap-1 justify-center"><Wifi size={10} /> Aktif</span> :
                        p.status === "error" ? <span className="text-xs bg-nexa-danger/10 text-nexa-danger px-2 py-0.5 rounded flex items-center gap-1 justify-center"><WifiOff size={10} /> Hata</span> :
                          <span className="text-xs bg-nexa-warning/10 text-nexa-warning px-2 py-0.5 rounded">Pasif</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-right text-nexa-text-secondary text-xs">{p.totalTokens?.toLocaleString() || 0} tok • ${(p.totalCost || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleTest(p.id)} disabled={testing === p.id} className="px-2 py-1 text-nexa-primary hover:bg-nexa-primary/10 rounded text-xs" title="Test"><Play size={12} className="inline" /> Test</button>
                      <button onClick={() => { setEditing(p); setForm({ name: p.name, provider: p.provider, apiKey: "", endpoint: p.endpoint || "", model: p.model, temperature: p.temperature, maxTokens: p.maxTokens, systemPrompt: p.systemPrompt || "" }); }} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-primary text-xs">Düzenle</button>
                      <button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-danger text-xs"><Trash2 size={12} className="inline" /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
