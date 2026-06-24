"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Radio, Heart, FileDown, CheckCircle, Clock, Play, Copy, Trash2, Plus, Save, X, ExternalLink, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { FEED_MAX_PRODUCTS_PER_FILE, planFeedChunks } from "@/lib/thyronix/feed-chunk";
import HealthPage from "../health/page";
import ImportExportPage from "../import-export/page";
import SyncPage from "../sync/page";
import LogsPage from "../logs/page";

const tabs = [
  { id: "feeds", label: "Feedler", icon: Radio },
  { id: "outputs", label: "Çıktılar", icon: FileDown },
  { id: "validation", label: "Doğrulama", icon: CheckCircle },
  { id: "health", label: "Sağlık", icon: Heart },
  { id: "history", label: "Geçmiş", icon: Clock },
];

const FORMATS = ["jetteknoloji", "trendyol", "hepsiburada", "n11", "google", "custom_xml", "csv"];

type Feed = {
  id: string;
  name: string;
  channel: string;
  status: string;
  outputFormat: string;
  productCount: number;
  lastPublished: string | null;
  schedule: number;
};

export default function FeedCenterPage() {
  const [activeTab, setActiveTab] = useState("feeds");
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Feed | null>(null);
  const [form, setForm] = useState({ name: "", channel: "trendyol", outputFormat: "jetteknoloji", schedule: 24 });
  const [plan, setPlan] = useState<{ key: string; limits: { maxFeeds: number } } | null>(null);
  const [activeProducts, setActiveProducts] = useState(0);
  const [defaultSchedule, setDefaultSchedule] = useState(24);

  const catalogChunkPlan = useMemo(
    () => planFeedChunks(activeProducts),
    [activeProducts]
  );

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/thyronix/feeds").then((r) => r.json()),
      fetch("/api/thyronix/workspace").then((r) => r.json()),
      fetch("/api/thyronix/reports").then((r) => r.json()),
    ])
      .then(([fd, ws, rep]) => {
        if (fd.success) setFeeds(fd.data || []);
        if (ws.success) {
          setPlan({ key: ws.data.planKey, limits: ws.data.limits });
          setDefaultSchedule(ws.data.automation?.feedIntervalHours || 24);
        }
        if (rep.success) setActiveProducts(rep.data?.activeProducts || rep.data?.totalProducts || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFeed = async () => {
    if (!form.name.trim()) return toast.error("Feed adı gerekli");
    const url = editing ? `/api/thyronix/feeds/${editing.id}` : "/api/thyronix/feeds";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(editing ? "Feed güncellendi" : "Feed oluşturuldu");
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", channel: "trendyol", outputFormat: "jetteknoloji", schedule: defaultSchedule });
      load();
    } else toast.error(d.error || "Hata");
  };

  const deleteFeed = async (id: string) => {
    if (!confirm("Feed silinsin mi?")) return;
    const res = await fetch(`/api/thyronix/feeds/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { toast.success("Silindi"); load(); } else toast.error(d.error);
  };

  const publishFeed = async (id: string) => {
    const res = await fetch("/api/thyronix/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedId: id }),
    });
    const d = await res.json();
    if (d.success) {
      const cp = d.data?.chunkPlan;
      if (cp?.needsSplit) {
        toast.success(`${d.data.productCount.toLocaleString("tr-TR")} ürün — ${cp.partCount} feed parçası`, { duration: 6000 });
        toast(cp.summaryTr, { icon: "📦", duration: 8000 });
      } else {
        toast.success(`${d.data.productCount.toLocaleString("tr-TR")} ürün ile yayınlandı`);
      }
      load();
    } else toast.error(d.error || "Yayın hatası");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Feed Merkezi</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">
            Feedleri yönetin, yayınlayın ve doğrulayın
            {plan && <span className="ml-2 text-nexa-primary">({feeds.length}/{plan.limits.maxFeeds} — {plan.key})</span>}
          </p>
        </div>
        {activeTab === "feeds" && (
          <button
            onClick={() => { setEditing(null); setForm({ name: "", channel: "trendyol", outputFormat: "jetteknoloji", schedule: defaultSchedule }); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-nexa-primary text-white text-sm font-semibold"
          >
            <Plus size={16} /> Yeni Feed
          </button>
        )}
      </div>

      <div className="border-b border-nexa-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? "border-nexa-primary text-nexa-primary" : "border-transparent text-nexa-text-secondary hover:text-nexa-text"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeProducts > FEED_MAX_PRODUCTS_PER_FILE && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
          <Layers className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div className="text-sm">
            <p className="font-semibold text-amber-100">Büyük katalog — feed parçalama aktif</p>
            <p className="text-amber-200/80 mt-1">{catalogChunkPlan.summaryTr}</p>
            <p className="text-xs text-amber-200/60 mt-2">
              Ham kayıt: {activeProducts.toLocaleString("tr-TR")} ürün · Parça başına max{" "}
              {FEED_MAX_PRODUCTS_PER_FILE.toLocaleString("tr-TR")} · Merge sonrası parça sayısı değişebilir.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-nexa-text">{editing ? "Feed Düzenle" : "Yeni Feed"}</h3>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-nexa-text-secondary" /></button>
          </div>
          <input className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" placeholder="Feed adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" placeholder="Kanal" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
          <select className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}>
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: Number(e.target.value) as 4 | 6 | 12 | 24 })}>
            <option value={4}>4 saat</option>
            <option value={6}>6 saat</option>
            <option value={12}>12 saat</option>
            <option value={24}>24 saat</option>
          </select>
          <button onClick={saveFeed} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nexa-primary text-white text-sm font-semibold">
            <Save size={14} /> Kaydet
          </button>
        </div>
      )}

      <div className="min-h-[400px]">
        {activeTab === "feeds" && (
          loading ? (
            <div className="animate-pulse h-40 rounded-xl bg-nexa-card border border-nexa-border" />
          ) : feeds.length === 0 ? (
            <div className="rounded-xl bg-nexa-card border border-nexa-border p-12 text-center">
              <Radio size={40} className="mx-auto text-nexa-primary/30 mb-3" />
              <h3 className="font-semibold text-nexa-text">Henüz feed yok</h3>
              <p className="text-sm text-nexa-text-secondary mt-1">15 dakikada ilk feedinizi oluşturmak için sihirbazı kullanın.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-nexa-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nexa-border bg-nexa-bg/50 text-nexa-text-secondary text-left">
                    <th className="px-4 py-3">Feed</th>
                    <th className="px-4 py-3">Format</th>
                    <th className="px-4 py-3">Kanal</th>
                    <th className="px-4 py-3">Son Yayın</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Aralık</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexa-border">
                  {feeds.map((f) => {
                    const feedParts = planFeedChunks(f.productCount || 0);
                    return (
                    <tr key={f.id} className="hover:bg-nexa-hover">
                      <td className="px-4 py-3 font-medium text-nexa-text">
                        {f.name}
                        <div className="text-xs text-nexa-text-secondary">
                          {(f.productCount || 0).toLocaleString("tr-TR")} ürün
                          {feedParts.needsSplit && (
                            <span className="ml-2 text-amber-400">· {feedParts.partCount} parça</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-nexa-text-secondary">{f.outputFormat}</td>
                      <td className="px-4 py-3 text-nexa-text-secondary">{f.channel}</td>
                      <td className="px-4 py-3 text-nexa-text-secondary text-xs">{f.lastPublished ? new Date(f.lastPublished).toLocaleString("tr-TR") : "—"}</td>
                      <td className="px-4 py-3"><span className={`text-xs ${f.status === "active" ? "text-nexa-success" : "text-nexa-warning"}`}>{f.status}</span></td>
                      <td className="px-4 py-3 text-nexa-text-secondary text-xs">{f.schedule || 24} saat</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button onClick={() => publishFeed(f.id)} className="p-2 rounded-lg hover:bg-nexa-primary/10 text-nexa-primary" title="Yayınla"><Play size={14} /></button>
                          {feedParts.partCount <= 1 ? (
                            <a href={`/api/thyronix/feed/${f.id}/output.xml`} target="_blank" className="p-2 rounded-lg hover:bg-nexa-hover text-nexa-text-secondary" title="XML"><ExternalLink size={14} /></a>
                          ) : (
                            feedParts.parts.slice(0, 3).map((p) => (
                              <a
                                key={p.part}
                                href={`/api/thyronix/feed/${f.id}/output.xml?part=${p.part}`}
                                target="_blank"
                                className="px-2 py-1 rounded text-[10px] bg-nexa-bg border border-nexa-border text-nexa-text-secondary hover:text-nexa-primary"
                                title={`${p.label} — ${p.productCount.toLocaleString("tr-TR")} ürün`}
                              >
                                P{p.part}
                              </a>
                            ))
                          )}
                          {feedParts.partCount > 3 && (
                            <a href={`/api/thyronix/feed/${f.id}/status`} target="_blank" className="px-2 py-1 text-[10px] text-nexa-primary">+{feedParts.partCount - 3}</a>
                          )}
                          <button onClick={() => { setEditing(f); setForm({ name: f.name, channel: f.channel, outputFormat: f.outputFormat, schedule: f.schedule || 24 }); setShowForm(true); }} className="p-2 rounded-lg hover:bg-nexa-hover text-nexa-text-secondary"><Copy size={14} /></button>
                          <button onClick={() => deleteFeed(f.id)} className="p-2 rounded-lg hover:bg-nexa-danger/10 text-nexa-danger"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
        {activeTab === "outputs" && <ImportExportPage />}
        {activeTab === "validation" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-8">
            <h3 className="font-semibold text-nexa-text mb-4">Feed Doğrulama</h3>
            <p className="text-sm text-nexa-text-secondary mb-4">Aktif feedlerinizin çıktı durumunu kontrol edin.</p>
            <div className="space-y-2">
              {feeds.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-nexa-border">
                  <span className="text-sm text-nexa-text">{f.name}</span>
                  <a href={`/api/thyronix/feed/${f.id}/status`} target="_blank" className="text-xs text-nexa-primary hover:underline">Durum API</a>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "health" && <HealthPage />}
        {activeTab === "history" && (
          <div className="space-y-6"><SyncPage /><LogsPage /></div>
        )}
      </div>
    </div>
  );
}
