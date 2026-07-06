"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Rss,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

type XmlStep = "setup" | "preview" | "categories" | "save" | "done";

interface XmlFeedListItem {
  id: string;
  name: string;
  feedUrl: string;
  rootCategory: string;
  status: string;
  templateId: string;
  syncIntervalHours: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastSyncStatus: string;
  productCount: number;
}

interface PreviewGroup {
  modelCode: string;
  name: string;
  category: string;
  variantCount?: number;
  rows?: unknown[];
  price?: number;
  stock?: number;
  errors?: string[];
}

const TEMPLATES = [
  { id: "leyna_v2", label: "Leyna v2", desc: "realPrice + varyant name1/value1" },
  { id: "leyna", label: "Leyna (legacy)", desc: "sitePrice formatı" },
  { id: "generic", label: "Generic XML", desc: "Standart alan adları" },
];

const LEYNA_PILOT_URL =
  "https://www.leyna.com.tr/export/1/a8564c17c365406e7d61aa34e6db9e9a31fb20b8";

export function XmlFeedPanel() {
  const [step, setStep] = useState<XmlStep>("setup");
  const [loading, setLoading] = useState(false);
  const [feeds, setFeeds] = useState<XmlFeedListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [name, setName] = useState("Leyna Feed");
  const [feedUrl, setFeedUrl] = useState(LEYNA_PILOT_URL);
  const [rootCategory, setRootCategory] = useState("Kadın İç Giyim");
  const [templateId, setTemplateId] = useState("leyna_v2");
  const [syncIntervalHours, setSyncIntervalHours] = useState(12);

  const [testResult, setTestResult] = useState<{
    productCount: number;
    categoryValues: string[];
    brandValues: string[];
    detectedFields: string[];
    error?: string;
  } | null>(null);

  const [preview, setPreview] = useState<{
    groups: PreviewGroup[];
    categoryValues: string[];
    totalRows: number;
    groupCount: number;
    unmappedCategories: string[];
    errors: string[];
    suggestedCategoryMapping: Record<string, string>;
  } | null>(null);

  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [savedFeedId, setSavedFeedId] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<{
    added: number;
    updated: number;
    skipped: number;
    errors: string[];
    status: string;
  } | null>(null);

  const loadFeeds = async () => {
    try {
      const res = await fetch("/api/admin/products/xml-feeds");
      const data = await res.json();
      if (data.success) setFeeds(data.data || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadFeeds();
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data || d.categories || []) as Array<{ name: string } | string>;
        setCategories(list.map((c) => (typeof c === "string" ? c : c.name)).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/products/xml-feeds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl, templateId }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Feed testi başarısız");
        setTestResult(data.data || { productCount: 0, categoryValues: [], brandValues: [], detectedFields: [], error: data.error });
        return;
      }
      setTestResult(data.data);
      toast.success(`${data.data.productCount} ürün algılandı`);
    } catch {
      toast.error("Feed okunamadı");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/xml-feeds/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl, rootCategory, templateId, categoryMappingJson: categoryMapping }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Önizleme hatası");
        return;
      }
      setPreview(data.data);
      const mapping = { ...data.data.suggestedCategoryMapping };
      setCategoryMapping((prev) => ({ ...mapping, ...prev }));
      setStep("preview");
    } catch {
      toast.error("Önizleme oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSync = async () => {
    setLoading(true);
    try {
      const createRes = await fetch("/api/admin/products/xml-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          feedUrl,
          rootCategory,
          templateId,
          syncIntervalHours,
          categoryMappingJson: categoryMapping,
        }),
      });
      const createData = await createRes.json();
      if (!createData.success) {
        toast.error(createData.error || "Feed kaydedilemedi");
        return;
      }
      const feedId = createData.data.id as string;
      setSavedFeedId(feedId);

      const syncRes = await fetch(`/api/admin/products/xml-feeds/${feedId}/sync`, { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncData.success) {
        toast.error(syncData.error || "Sync hatası");
        return;
      }
      setSyncReport(syncData.data);
      setStep("done");
      toast.success(`Sync tamam: ${syncData.data.added} yeni, ${syncData.data.updated} güncellendi`);
      loadFeeds();
    } catch {
      toast.error("Kayıt veya sync başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (feedId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/xml-feeds/${feedId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Sync hatası");
        return;
      }
      toast.success(`${data.data.added} yeni, ${data.data.updated} güncellendi`);
      loadFeeds();
    } catch {
      toast.error("Sync başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm("Bu feed ve bağlantı kayıtları silinsin mi? Ürünler silinmez.")) return;
    try {
      const res = await fetch(`/api/admin/products/xml-feeds/${feedId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Silinemedi");
        return;
      }
      toast.success("Feed silindi");
      loadFeeds();
    } catch {
      toast.error("Silme hatası");
    }
  };

  const okGroups = preview?.groups.filter((g) => !(g.errors?.length)).length || 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-violet-600 shadow-sm">
            <Rss size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">XML ile Ürün Ekleme</h2>
            <p className="mt-1 text-xs text-gray-600">
              Harici XML feed URL&apos;si ile ürün içe aktarın. Fiyat ×1.25, marka Ena Unity, admin düzenlemeleri korunur.
              12 saatte bir otomatik sync.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
        {(["setup", "preview", "categories", "done"] as XmlStep[]).map((s, i) => (
          <span
            key={s}
            className={`flex items-center gap-1 ${step === s || (step === "save" && s === "categories") ? "font-semibold text-gray-900" : ""}`}
          >
            {i > 0 && <ChevronRight size={12} />}
            {s === "setup" ? "1. Feed" : s === "preview" ? "2. Önizleme" : s === "categories" ? "3. Kategori" : "4. Tamam"}
          </span>
        ))}
      </div>

      {step === "setup" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Feed Ayarları</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Feed Adı</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">XML Feed URL</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-xs"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Kök Kategori (ana sayfada gizli)</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={rootCategory}
                  onChange={(e) => setRootCategory(e.target.value)}
                  placeholder="Kadın İç Giyim"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Şablon</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    {TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Sync Aralığı (saat)</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={syncIntervalHours}
                    onChange={(e) => setSyncIntervalHours(Number(e.target.value) || 12)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handleTest} disabled={loading || !feedUrl}>
                {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                Feed Test Et
              </Button>
              <Button onClick={handlePreview} disabled={loading || !feedUrl || !rootCategory}>
                Önizleme Oluştur
              </Button>
            </div>
            {testResult && (
              <div className={`mt-4 rounded-lg p-3 text-xs ${testResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {testResult.error ? (
                  <p className="flex items-center gap-1"><AlertCircle size={14} /> {testResult.error}</p>
                ) : (
                  <>
                    <p className="flex items-center gap-1"><CheckCircle size={14} /> {testResult.productCount} ürün · {testResult.categoryValues.length} kategori</p>
                    {testResult.brandValues.length > 0 && (
                      <p className="mt-1 text-gray-600">Markalar (temizlenecek): {testResult.brandValues.slice(0, 5).join(", ")}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {feeds.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Kayıtlı Feed&apos;ler</h3>
              <div className="space-y-2">
                {feeds.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 text-sm">
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-gray-500">
                        {f.productCount} ürün · {f.lastSyncStatus || "henüz sync yok"} · {f.syncIntervalHours}h
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={loading} onClick={() => handleManualSync(f.id)}>
                        <RefreshCw size={14} className="mr-1" /> Sync
                      </Button>
                      <Button size="sm" variant="outline" disabled={loading} onClick={() => handleDeleteFeed(f.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold">{preview.totalRows}</p><p className="text-xs text-gray-500">Satır</p></div>
              <div className="rounded-lg bg-blue-50 p-3"><p className="text-xl font-bold text-blue-700">{preview.groupCount}</p><p className="text-xs text-blue-600">Parent</p></div>
              <div className="rounded-lg bg-green-50 p-3"><p className="text-xl font-bold text-green-700">{okGroups}</p><p className="text-xs text-green-600">Hazır</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><p className="text-xl font-bold text-amber-600">{preview.unmappedCategories.length}</p><p className="text-xs text-amber-600">Eşlenmemiş Kat.</p></div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Fiyat kuralı: realPrice × 1.25 · Marka: Ena Unity</p>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-left">Başlık</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-right">Varyant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.groups.map((g) => (
                  <tr key={g.modelCode}>
                    <td className="px-3 py-2 font-mono">{g.modelCode}</td>
                    <td className="max-w-[180px] truncate px-3 py-2">{g.name}</td>
                    <td className="px-3 py-2">{g.category}</td>
                    <td className="px-3 py-2 text-right">{g.rows?.length ?? g.variantCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("setup")}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
            <Button onClick={() => setStep("categories")} disabled={okGroups === 0}>Kategori Eşleme <ChevronRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {step === "categories" && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Kategori Eşleme</h3>
            <p className="mb-4 text-xs text-gray-500">XML alt kategori → mağaza kategorisi (ürünler katalogda bu kategoride listelenir)</p>
            <div className="space-y-2">
              {preview.categoryValues.map((src) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm text-gray-600" title={src}>{src}</span>
                  <span className="text-gray-300">→</span>
                  <select
                    className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                    value={categoryMapping[src] || src}
                    onChange={(e) => setCategoryMapping({ ...categoryMapping, [src]: e.target.value })}
                  >
                    <option value={src}>{src}</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("preview")}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
            <Button onClick={handleSaveAndSync} disabled={loading}>
              {loading ? <><Loader2 size={14} className="mr-1 animate-spin" /> Kaydediliyor...</> : "Feed Kaydet ve İlk Sync"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && syncReport && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <CheckCircle size={32} className="mb-3 text-green-600" />
            <h3 className="text-lg font-bold">XML Feed Aktif</h3>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-green-600">{syncReport.added}</p><p className="text-xs">Yeni</p></div>
              <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-blue-600">{syncReport.updated}</p><p className="text-xs">Güncellenen</p></div>
              <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-amber-600">{syncReport.skipped}</p><p className="text-xs">Atlanan</p></div>
            </div>
            {syncReport.errors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto text-xs text-red-600">
                {syncReport.errors.slice(0, 15).map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep("setup"); setPreview(null); setSyncReport(null); }}>
              Yeni Feed
            </Button>
            {savedFeedId && (
              <Button variant="outline" disabled={loading} onClick={() => handleManualSync(savedFeedId)}>
                <RefreshCw size={14} className="mr-1" /> Tekrar Sync
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
