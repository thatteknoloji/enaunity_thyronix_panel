"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, RefreshCw, Play, CheckCircle2, AlertCircle,
  Link2, Table2, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

type MappingRow = {
  xmlField: string;
  thyronixField: string;
  label: string;
  type: string;
  required: boolean;
  example: string;
  notes?: string;
};

type SavedSource = {
  id: string;
  name: string;
  xmlUrl: string;
  status: string;
  productCount: number;
  lastSync: string | null;
  errorLog: string | null;
  feedUrls: string[];
};

export default function BezosBayiConnectorPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mappingDoc, setMappingDoc] = useState<MappingRow[]>([]);
  const [feedUrls, setFeedUrls] = useState<string[]>([]);
  const [savedSource, setSavedSource] = useState<SavedSource | null>(null);
  const [samplePreview, setSamplePreview] = useState<Record<string, unknown>[]>([]);
  const [liveTest, setLiveTest] = useState<{ total: number; feeds: { url: string; count: number; error?: string }[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/thyronix/connectors/bezos-bayi");
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setMappingDoc(d.data.connector.mappingDoc || []);
      const urls =
        d.data.savedSource?.feedUrls?.length > 0
          ? d.data.savedSource.feedUrls
          : d.data.connector.feedUrls || [];
      setFeedUrls(urls);
      setSavedSource(d.data.savedSource);
      setSamplePreview(d.data.samplePreview || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/thyronix/connectors/bezos-bayi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save" }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Kayıt başarısız");
      toast.success(d.created ? "Bezos kaynağı oluşturuldu" : "Bezos kaynağı güncellendi");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  };

  const handleLiveTest = async () => {
    setTesting(true);
    setLiveTest(null);
    try {
      const res = await fetch("/api/thyronix/connectors/bezos-bayi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-live", feedUrls }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Test başarısız");
      setLiveTest(d.data);
      toast.success(`Canlı test: ${d.data.total} ürün bulundu`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Canlı XML erişilemedi (IP/bayi yetkisi gerekebilir)");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!savedSource?.id) return toast.error("Önce kaynağı kaydedin");
    setSyncing(true);
    try {
      const res = await fetch(`/api/thyronix/sources/${savedSource.id}/sync`, { method: "POST" });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Sync hatası");
      toast.success(`${d.data.total} ürün senkronize edildi`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync hatası");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-nexa-text-secondary text-sm animate-pulse">Yükleniyor…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/thyronix/sources" className="inline-flex items-center gap-1 text-xs text-nexa-text-secondary hover:text-nexa-primary mb-2">
            <ArrowLeft size={14} /> Kaynaklar
          </Link>
          <h1 className="text-xl font-bold text-nexa-text">Bezos BAYİ XML Bağlantısı</h1>
          <p className="text-sm text-nexa-text-secondary mt-1 max-w-2xl">
            Esra Güden bayisi için Bezos tedarikçi XML feed eşleştirmesi. İki sayfalı feed (OFFSET=0 + OFFSET=50000) otomatik birleştirilir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexa-primary px-3 py-2 text-xs font-medium text-white hover:bg-nexa-primary/90 disabled:opacity-50">
            <Save size={14} /> {saving ? "Kaydediliyor…" : "Eşleştirmeyi Kaydet"}
          </button>
          <button onClick={handleLiveTest} disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexa-border px-3 py-2 text-xs font-medium text-nexa-text hover:bg-nexa-hover disabled:opacity-50">
            <Play size={14} /> {testing ? "Test…" : "Canlı XML Test"}
          </button>
          {savedSource && (
            <button onClick={handleSync} disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50">
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Senkronize Et
            </button>
          )}
        </div>
      </div>

      {/* Durum kartı */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-nexa-text">
            <Link2 size={16} className="text-nexa-primary" /> Feed URL&apos;leri
          </div>
          <ul className="space-y-2 text-xs">
            {feedUrls.map((url, i) => (
              <li key={url} className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-nexa-primary/15 px-1.5 py-0.5 text-[10px] font-mono text-nexa-primary">
                  {i === 0 ? "Sayfa 1" : "Sayfa 2"}
                </span>
                <a href={url} target="_blank" rel="noreferrer" className="text-nexa-text-secondary hover:text-nexa-primary break-all font-mono">
                  {url} <ExternalLink size={10} className="inline ml-0.5" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-nexa-text-secondary">
            Bezos bayi panelinden verilen URL&apos;ler. OFFSET=50000 ikinci sayfa (50.001+ ürün).
          </p>
        </div>

        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4 space-y-2">
          <div className="text-sm font-semibold text-nexa-text">Kayıtlı Kaynak</div>
          {savedSource ? (
            <>
              <div className="flex items-center gap-2">
                {savedSource.status === "active" ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={16} className="text-amber-400" />
                )}
                <span className="text-sm text-nexa-text">{savedSource.name}</span>
              </div>
              <p className="text-xs text-nexa-text-secondary">
                {savedSource.productCount.toLocaleString("tr-TR")} ürün
                {savedSource.lastSync && ` · Son sync: ${new Date(savedSource.lastSync).toLocaleString("tr-TR")}`}
              </p>
              {savedSource.errorLog && (
                <p className="text-xs text-red-400">{savedSource.errorLog}</p>
              )}
              <Link href="/thyronix/sources" className="text-xs text-nexa-primary hover:underline">
                Kaynaklar listesinde gör →
              </Link>
            </>
          ) : (
            <p className="text-xs text-nexa-text-secondary">Henüz kaydedilmedi. &quot;Eşleştirmeyi Kaydet&quot; ile Thyronix kaynağı oluşturulur.</p>
          )}
        </div>
      </div>

      {/* Canlı test sonucu */}
      {liveTest && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <h2 className="text-sm font-semibold text-nexa-text mb-2">Canlı Test Sonucu</h2>
          <p className="text-lg font-bold text-nexa-primary">{liveTest.total.toLocaleString("tr-TR")} ürün</p>
          <ul className="mt-2 space-y-1 text-xs text-nexa-text-secondary">
            {liveTest.feeds.map((f) => (
              <li key={f.url} className="font-mono break-all">
                {f.error ? `✗ ${f.error}` : `✓ ${f.count} ürün — ${f.url}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Eşleştirme tablosu */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-nexa-border">
          <Table2 size={16} className="text-nexa-primary" />
          <h2 className="text-sm font-semibold text-nexa-text">Alan Eşleştirmeleri (Bezos → THYRONIX)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-nexa-bg/50 text-nexa-text-secondary">
                <th className="px-4 py-2 text-left font-medium">XML Alanı</th>
                <th className="px-4 py-2 text-left font-medium">THYRONIX</th>
                <th className="px-4 py-2 text-left font-medium">Açıklama</th>
                <th className="px-4 py-2 text-left font-medium">Örnek</th>
                <th className="px-4 py-2 text-center font-medium">Zorunlu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border/50">
              {mappingDoc.map((row) => (
                <tr key={row.xmlField} className="hover:bg-nexa-hover/30">
                  <td className="px-4 py-2 font-mono text-orange-300">{row.xmlField}</td>
                  <td className="px-4 py-2 font-mono text-nexa-primary">{row.thyronixField}</td>
                  <td className="px-4 py-2 text-nexa-text-secondary">
                    {row.label}
                    {row.notes && <span className="block text-[10px] mt-0.5 opacity-70">{row.notes}</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-nexa-text-secondary max-w-[180px] truncate">{row.example}</td>
                  <td className="px-4 py-2 text-center">{row.required ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Örnek parse önizleme */}
      {samplePreview.length > 0 && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
          <div className="px-4 py-3 border-b border-nexa-border">
            <h2 className="text-sm font-semibold text-nexa-text">Örnek Parse Önizleme (test XML)</h2>
            <p className="text-[11px] text-nexa-text-secondary mt-0.5">Canlı feed erişilemezse eşleştirmenin doğruluğu bu örnek veriyle doğrulanır.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-nexa-bg/50 text-nexa-text-secondary">
                  <th className="px-3 py-2 text-left">Ad</th>
                  <th className="px-3 py-2 text-left">Barkod</th>
                  <th className="px-3 py-2 text-left">Stok Kodu</th>
                  <th className="px-3 py-2 text-right">Fiyat</th>
                  <th className="px-3 py-2 text-right">Alış</th>
                  <th className="px-3 py-2 text-right">Stok</th>
                  <th className="px-3 py-2 text-left">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border/50">
                {samplePreview.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-nexa-text max-w-[200px] truncate">{String(p.name)}</td>
                    <td className="px-3 py-2 font-mono">{String(p.barcode || "—")}</td>
                    <td className="px-3 py-2 font-mono">{String(p.stockCode || "—")}</td>
                    <td className="px-3 py-2 text-right">{Number(p.price).toLocaleString("tr-TR")} ₺</td>
                    <td className="px-3 py-2 text-right">{p.costPrice ? `${Number(p.costPrice).toLocaleString("tr-TR")} ₺` : "—"}</td>
                    <td className="px-3 py-2 text-right">{String(p.stock)}</td>
                    <td className="px-3 py-2">{String(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
