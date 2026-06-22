"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package, Download, Layers, ShoppingCart, Clock, CheckCircle2, Ban, History,
  Search, Eye, Filter, Wand2, Store, Save, Trash2, RefreshCw,
} from "lucide-react";
import { plApi } from "./api";
import {
  PL_PANEL, PlAlert, PlBadge, PlBtn, PlCard, PlEmpty, PlHeader, PlInput, PlModal,
  PlSelect, PlStat, PlTabs, fmtDate, fmtMoney,
} from "./pl-ui";
import { UI } from "@/lib/ui/turkish-labels";
import { PaymentCheckoutPanel } from "@/components/payments/PaymentCheckoutPanel";

type DealerState = "ACCESSIBLE" | "PURCHASE" | "PENDING" | "INACTIVE";
type Tab = "packages" | "catalogs" | "history" | "uploads";

type RecipeForm = {
  id?: string;
  name: string;
  connectionId: string;
  storeName: string;
  format: string;
  values: Record<string, any>;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildEmptyRecipeForm(): RecipeForm {
  return {
    name: "",
    connectionId: "",
    storeName: "",
    format: "EXCEL",
    values: {},
  };
}

function recipeFromApi(recipe: any): RecipeForm {
  return {
    id: recipe.id,
    name: recipe.name || "",
    connectionId: recipe.connectionId || "",
    storeName: recipe.storeName || "",
    format: recipe.format || "EXCEL",
    values: parseJson(recipe.valuesJson, {}),
  };
}

function StateBadge({ state }: { state: DealerState }) {
  const map: Record<DealerState, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    ACCESSIBLE: { label: "Erişilebilir", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    PURCHASE: { label: "Satın Al", className: "bg-blue-50 text-blue-700 border-blue-200", icon: ShoppingCart },
    PENDING: { label: "Onay Bekliyor", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    INACTIVE: { label: "Paket Pasif", className: "bg-slate-100 text-slate-500 border-slate-200", icon: Ban },
  };
  const s = map[state];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${s.className}`}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function PriceBadge({ pkg }: { pkg: any }) {
  if (pkg.isFree || pkg.billingType === "FREE") {
    return <span className="text-xs font-semibold text-emerald-600">Ücretsiz</span>;
  }
  const price = pkg.price ?? 0;
  const suffix = pkg.billingType === "MONTHLY" ? "/ay" : pkg.billingType === "YEARLY" ? "/yıl" : "";
  return <span className="text-sm font-bold text-slate-900">{fmtMoney(price)}{suffix}</span>;
}

function UploadJobBadge({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "FAILED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : status === "PROCESSING"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-amber-50 text-amber-700 border-amber-200";
  const label =
    status === "COMPLETED"
      ? "Tamamlandı"
      : status === "FAILED"
        ? "Hata"
        : status === "PROCESSING"
          ? "İşleniyor"
          : "Bekliyor";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>;
}

export default function DealerProductLibraryPanel() {
  const [tab, setTab] = useState<Tab>("packages");
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [uploadJobs, setUploadJobs] = useState<any[]>([]);
  const [tier, setTier] = useState("FREE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [recipeModal, setRecipeModal] = useState<{ packageId: string; packageName: string; slug: string } | null>(null);
  const [recipeData, setRecipeData] = useState<any>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeForm>(buildEmptyRecipeForm());
  const [recipePreview, setRecipePreview] = useState<any>(null);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [queueingRecipe, setQueueingRecipe] = useState(false);
  const [jobDownloading, setJobDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, pkgData, jobs] = await Promise.all([
        plApi<any[]>("/api/product-library/catalogs"),
        plApi<{ packages: any[]; tier: string; downloads: any[] }>("/api/product-library/my-packages"),
        plApi<any[]>("/api/product-library/marketplace-jobs?limit=50"),
      ]);
      setCatalogs(cats);
      setPackages(pkgData.packages);
      setTier(pkgData.tier);
      setDownloads(pkgData.downloads || []);
      setUploadJobs(jobs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    accessible: packages.filter((p) => p.dealerState === "ACCESSIBLE").length,
    pending: packages.filter((p) => p.dealerState === "PENDING").length,
    totalProducts: packages.reduce((s, p) => s + (p.productCount || 0), 0),
    catalogCount: catalogs.length,
    pendingUploads: uploadJobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING").length,
  }), [packages, catalogs, uploadJobs]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (stateFilter !== "ALL" && p.dealerState !== stateFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    });
  }, [packages, search, stateFilter]);

  const download = async (packageId: string, format: string, slug?: string, recipeId?: string) => {
    setDownloading(`${packageId}-${format}-${recipeId || "default"}`);
    setError(null);
    try {
      const r = await fetch(`/api/product-library/package/${packageId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, recipeId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "İndirme başarısız");
      }
      const blob = await r.blob();
      const ext = format === "EXCEL" ? "xlsx" : format.toLowerCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || packageId}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`${format} indirildi`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İndirme hatası");
    } finally {
      setDownloading(null);
    }
  };

  const purchase = async (packageId: string, paymentMethod: string) => {
    setPurchasing(packageId);
    setError(null);
    setSuccess(null);
    try {
      const result = await plApi<{ free?: boolean; redirectUrl?: string | null }>("/api/product-library/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, paymentMethod }),
      });
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setSuccess(result.free ? "Ücretsiz paket erişiminiz açıldı" : "Satın alma talebiniz alındı, ödeme onayı bekleniyor");
      setPurchaseModal(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Satın alma hatası");
    } finally {
      setPurchasing(null);
    }
  };

  const openDetail = async (packageId: string) => {
    try {
      setDetailModal(await plApi(`/api/product-library/package/${packageId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detay yüklenemedi");
    }
  };

  const loadRecipeData = useCallback(async (packageId: string) => {
    const data = await plApi<any>(`/api/product-library/package/${packageId}/recipes`);
    setRecipeData(data);
    return data;
  }, []);

  const openRecipeManager = async (pkg: { id: string; name: string; slug: string }) => {
    setRecipeLoading(true);
    setRecipeModal({ packageId: pkg.id, packageName: pkg.name, slug: pkg.slug });
    setRecipePreview(null);
    setRecipeForm(buildEmptyRecipeForm());
    try {
      const data = await loadRecipeData(pkg.id);
      if (data.recipes?.[0]) setRecipeForm(recipeFromApi(data.recipes[0]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reçeteler yüklenemedi");
    } finally {
      setRecipeLoading(false);
    }
  };

  const saveRecipe = async () => {
    if (!recipeModal) return;
    if (!recipeForm.name.trim()) {
      setError("Reçete adı zorunlu");
      return;
    }
    setRecipeSaving(true);
    try {
      const body = {
        name: recipeForm.name,
        connectionId: recipeForm.connectionId,
        storeName: recipeForm.storeName,
        format: recipeForm.format,
        values: recipeForm.values,
        lastPreview: recipePreview || {},
      };
      const saved = recipeForm.id
        ? await plApi<any>(`/api/product-library/package/${recipeModal.packageId}/recipes/${recipeForm.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await plApi<any>(`/api/product-library/package/${recipeModal.packageId}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const refreshed = await loadRecipeData(recipeModal.packageId);
      const matched = refreshed.recipes.find((item: any) => item.id === saved.id) || saved;
      setRecipeForm(recipeFromApi(matched));
      setSuccess("Reçete kaydedildi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reçete kaydedilemedi");
    } finally {
      setRecipeSaving(false);
    }
  };

  const deleteRecipe = async () => {
    if (!recipeModal || !recipeForm.id) return;
    try {
      await plApi(`/api/product-library/package/${recipeModal.packageId}/recipes/${recipeForm.id}`, { method: "DELETE" });
      const refreshed = await loadRecipeData(recipeModal.packageId);
      setRecipeForm(refreshed.recipes?.[0] ? recipeFromApi(refreshed.recipes[0]) : buildEmptyRecipeForm());
      setRecipePreview(null);
      setSuccess("Reçete kaldırıldı");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reçete silinemedi");
    }
  };

  const previewRecipe = async () => {
    if (!recipeModal) return;
    try {
      const preview = await plApi<any>(`/api/product-library/package/${recipeModal.packageId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: recipeForm.values }),
      });
      setRecipePreview(preview);
      setSuccess("Önizleme hazırlandı");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme alınamadı");
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "packages", label: "Paketler", icon: Package },
    { id: "catalogs", label: "Kataloglar", icon: Layers },
    { id: "history", label: "İndirme Geçmişi", icon: History },
    { id: "uploads", label: "Mağaza Kuyruğu", icon: Store },
  ];

  const editableRules = recipeData?.template?.fieldRules?.filter((rule: any) => !["LOCKED", "HIDDEN"].includes(rule.behavior)) || [];

  const queueRecipeToMarketplace = async () => {
    if (!recipeModal || !recipeForm.id) {
      setError("Önce reçeteyi kaydetmelisin");
      return;
    }
    setQueueingRecipe(true);
    try {
      const job = await plApi<any>("/api/product-library/marketplace-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: recipeModal.packageId,
          recipeId: recipeForm.id,
          connectionId: recipeForm.connectionId,
          format: recipeForm.format,
        }),
      });
      setSuccess(`${job.connection?.platform || "Mağaza"} kuyruğuna gönderildi`);
      await load();
      setTab("uploads");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme işi oluşturulamadı");
    } finally {
      setQueueingRecipe(false);
    }
  };

  const downloadJobFile = async (jobId: string) => {
    setJobDownloading(jobId);
    try {
      const response = await fetch(`/api/product-library/marketplace-jobs/${jobId}/file`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Dosya indirilemedi");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      const match = contentDisposition?.match(/filename=\"?([^"]+)\"?/);
      a.download = match?.[1] || `${jobId}.dat`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dosya indirilemedi");
    } finally {
      setJobDownloading(null);
    }
  };

  const retryUploadJob = async (job: any) => {
    try {
      await plApi<any>("/api/product-library/marketplace-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: job.packageId,
          recipeId: job.recipeId || undefined,
          connectionId: job.connectionId,
          format: job.format,
        }),
      });
      setSuccess("Yükleme işi yeniden kuyruğa alındı");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yeniden kuyruğa alınamadı");
    }
  };

  return (
    <div className={`${PL_PANEL}`}>
      <PlHeader
        title={UI.productLibraryDealer}
        subtitle={`Lisans seviyesi: ${tier} — hazır ürün havuzunuz`}
        onRefresh={load}
        loading={loading}
      />

      {error && <div className="mb-4"><PlAlert type="error">{error}</PlAlert></div>}
      {success && <div className="mb-4"><PlAlert type="success">{success}</PlAlert></div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <PlStat label="Erişilebilir Paket" value={metrics.accessible} icon={CheckCircle2} />
        <PlStat label="Bekleyen Talep" value={metrics.pending} icon={Clock} />
        <PlStat label="Toplam Ürün" value={metrics.totalProducts} icon={Package} />
        <PlStat label="Katalog" value={metrics.catalogCount} icon={Layers} />
        <PlStat label="Bekleyen Yükleme" value={metrics.pendingUploads} icon={Store} />
      </div>

      <PlTabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : (
        <>
          {tab === "packages" && (
            <div className="space-y-4">
              <PlCard className="p-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <PlInput className="pl-9" placeholder="Paket ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <PlSelect className="w-44" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="ALL">Tüm durumlar</option>
                  <option value="ACCESSIBLE">Erişilebilir</option>
                  <option value="PURCHASE">Satın alınabilir</option>
                  <option value="PENDING">Onay bekliyor</option>
                </PlSelect>
              </PlCard>

              {filteredPackages.length === 0 ? (
                <PlCard className="p-8"><PlEmpty message="Eşleşen paket bulunamadı" /></PlCard>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredPackages.map((p) => (
                    <PlCard key={p.id} className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{p.name}</h3>
                            {p.badgeText && <PlBadge tone="violet">{p.badgeText}</PlBadge>}
                            {p.isNew && <PlBadge tone="blue">Yeni</PlBadge>}
                            {p.isBestSeller && <PlBadge tone="amber">Çok Satan</PlBadge>}
                            {p.thyronixReady && <PlBadge tone="blue">THYRONIX</PlBadge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description || "—"}</p>
                        </div>
                        <StateBadge state={p.dealerState} />
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>{p.productCount} ürün</p>
                          <p>Son güncelleme: {new Date(p.updatedAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <PriceBadge pkg={p} />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <PlBtn variant="ghost" size="sm" onClick={() => openDetail(p.id)}>
                          <Eye size={12} /> Detay
                        </PlBtn>
                        {p.dealerState === "ACCESSIBLE" && (
                          <PlBtn variant="secondary" size="sm" onClick={() => openRecipeManager(p)}>
                            <Wand2 size={12} /> Excel/XML Motoru
                          </PlBtn>
                        )}
                        {p.dealerState === "ACCESSIBLE" && ["XML", "CSV", "EXCEL"].map((fmt) => (
                          <PlBtn
                            key={fmt}
                            variant="secondary"
                            size="sm"
                            onClick={() => download(p.id, fmt, p.slug)}
                            disabled={downloading === `${p.id}-${fmt}-default`}
                          >
                            <Download size={12} /> {fmt}
                          </PlBtn>
                        ))}
                        {p.dealerState === "PURCHASE" && (
                          <PlBtn size="sm" onClick={() => setPurchaseModal(p.id)} disabled={purchasing === p.id}>
                            <ShoppingCart size={12} /> Satın Al
                          </PlBtn>
                        )}
                        {p.dealerState === "PENDING" && (
                          <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} /> Ödeme onayı bekleniyor</span>
                        )}
                      </div>
                    </PlCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "catalogs" && (
            catalogs.length === 0 ? (
              <PlCard className="p-8"><PlEmpty message="Erişilebilir katalog yok — önce bir paket satın alın veya erişim alın" /></PlCard>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {catalogs.map((c) => (
                  <PlCard key={c.id} className="p-4">
                    <h3 className="font-medium text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{c.productCount} ürün · {c.brandCount ?? 0} marka</p>
                    {c.packageName && <p className="text-xs text-ena-primary mt-2">Paket: {c.packageName}</p>}
                  </PlCard>
                ))}
              </div>
            )
          )}

          {tab === "history" && (
            downloads.length === 0 ? (
              <PlCard className="p-8"><PlEmpty message="Henüz indirme yok" /></PlCard>
            ) : (
              <PlCard className="divide-y divide-slate-100">
                {downloads.map((d) => (
                  <div key={d.id} className="px-4 py-3 flex justify-between text-sm text-slate-700">
                    <span>
                      {d.package?.name || d.packageId} · <PlBadge tone="blue">{d.format}</PlBadge>
                      {(d.recipeName || d.storeName) && <span className="ml-2 text-xs text-slate-500">{d.recipeName || d.storeName}</span>}
                    </span>
                    <span className="text-slate-500 text-xs">{fmtDate(d.createdAt)}</span>
                  </div>
                ))}
              </PlCard>
            )
          )}

          {tab === "uploads" && (
            uploadJobs.length === 0 ? (
              <PlCard className="p-8"><PlEmpty message="Henüz mağazaya gönderilmiş iş yok" /></PlCard>
            ) : (
              <PlCard className="divide-y divide-slate-100">
                {uploadJobs.map((job) => (
                  <div key={job.id} className="px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{job.package?.name || job.packageId}</span>
                        <UploadJobBadge status={job.status} />
                        <PlBadge tone="blue">{job.connection?.platform || job.platform || "Mağaza"}</PlBadge>
                        <PlBadge tone="gray">{job.format}</PlBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {job.recipe?.name || "Varsayılan reçete"} · {job.storeName || job.connection?.storeId || job.connection?.sellerId || "Mağaza"} · {job.itemCount} satır
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {fmtDate(job.createdAt)} {job.targetUrl ? `· Hedef: ${job.targetUrl}` : ""}
                      </p>
                      {job.errorMessage && <p className="mt-1 text-xs text-rose-600">{job.errorMessage}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PlBtn
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadJobFile(job.id)}
                        disabled={jobDownloading === job.id}
                      >
                        <Download size={12} /> Dosya
                      </PlBtn>
                      {(job.status === "FAILED" || job.status === "COMPLETED") && (
                        <PlBtn variant="ghost" size="sm" onClick={() => retryUploadJob(job)}>
                          <RefreshCw size={12} /> Yeniden Gönder
                        </PlBtn>
                      )}
                    </div>
                  </div>
                ))}
              </PlCard>
            )
          )}
        </>
      )}

      <PlModal open={!!purchaseModal} onClose={() => setPurchaseModal(null)} title="Ödeme">
        {purchaseModal && (() => {
          const pkg = packages.find((p) => p.id === purchaseModal);
          const amount = pkg?.price ?? 0;
          return (
            <PaymentCheckoutPanel
              amount={amount}
              title={pkg?.name ? `${pkg.name} — Ödeme` : undefined}
              loading={purchasing === purchaseModal}
              onConfirm={(method) => purchase(purchaseModal, method)}
            />
          );
        })()}
      </PlModal>

      <PlModal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.package?.name || "Paket Detayı"} wide>
        {detailModal && (
          <div className="space-y-4 text-sm text-slate-700">
            <p>{detailModal.package?.description}</p>
            <div className="grid grid-cols-3 gap-3">
              <PlStat label="Ürün" value={detailModal.productCount} icon={Package} />
              <PlStat label="Marka" value={detailModal.brandCount} icon={Filter} />
              <PlStat label="Lisans" value={detailModal.tier} icon={Layers} />
            </div>
            {detailModal.thyronixReady && <PlBadge tone="blue">THYRONIX entegrasyonuna hazır</PlBadge>}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Kataloglar</h4>
              <div className="flex flex-wrap gap-2">
                {detailModal.catalogs?.map((c: any) => <PlBadge key={c.id} tone="blue">{c.name} ({c.productCount})</PlBadge>)}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Excel/XML alanları</h4>
              <div className="flex flex-wrap gap-2">
                {detailModal.template?.fieldRules?.slice(0, 12).map((rule: any) => (
                  <PlBadge key={rule.key} tone="gray">{rule.label}</PlBadge>
                ))}
              </div>
            </div>
          </div>
        )}
      </PlModal>

      <PlModal open={!!recipeModal} onClose={() => setRecipeModal(null)} title={recipeModal?.packageName || "Excel/XML Motoru"} wide>
        {recipeModal && (
          recipeLoading ? (
            <p className="text-sm text-slate-500">Reçeteler yükleniyor…</p>
          ) : (
            <div className="space-y-4 text-sm text-slate-700">
              <PlCard className="p-4">
                <div className="flex items-center gap-2 mb-3 text-slate-900 font-medium">
                  <Store size={16} /> Mağaza Reçeteleri
                </div>
                {recipeData?.recipes?.length ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipeData.recipes.map((recipe: any) => (
                      <button
                        key={recipe.id}
                        onClick={() => {
                          setRecipeForm(recipeFromApi(recipe));
                          setRecipePreview(parseJson(recipe.lastPreviewJson, null));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border ${recipeForm.id === recipe.id ? "bg-ena-primary text-white border-ena-primary" : "bg-white text-slate-700 border-slate-200"}`}
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3">Henüz kayıtlı reçete yok. İlk mağaza reçeteni oluştur.</p>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  <PlInput
                    placeholder="Reçete adı"
                    value={recipeForm.name}
                    onChange={(e) => setRecipeForm((current) => ({ ...current, name: e.target.value }))}
                  />
                  <PlSelect
                    value={recipeForm.connectionId}
                    onChange={(e) => setRecipeForm((current) => ({ ...current, connectionId: e.target.value }))}
                  >
                    <option value="">Bağlı mağaza seç</option>
                    {recipeData?.connections?.map((connection: any) => (
                      <option key={connection.id} value={connection.id}>{connection.label}</option>
                    ))}
                  </PlSelect>
                  <PlInput
                    placeholder="Mağaza adı"
                    value={recipeForm.storeName}
                    onChange={(e) => setRecipeForm((current) => ({ ...current, storeName: e.target.value }))}
                  />
                  <PlSelect
                    value={recipeForm.format}
                    onChange={(e) => setRecipeForm((current) => ({ ...current, format: e.target.value }))}
                  >
                    {(recipeData?.template?.exportFormats || ["EXCEL", "XML", "CSV"]).map((format: string) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </PlSelect>
                </div>
              </PlCard>

              <PlCard className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">Dönüştürülebilir Alanlar</h4>
                    <p className="text-xs text-slate-500 mt-1">Adminin izin verdiği sütunları mağazana özel dönüştür.</p>
                  </div>
                  <div className="flex gap-2">
                    <PlBtn variant="secondary" size="sm" onClick={() => { setRecipeForm(buildEmptyRecipeForm()); setRecipePreview(null); }}>
                      Yeni Reçete
                    </PlBtn>
                    {recipeForm.id && (
                      <PlBtn variant="danger" size="sm" onClick={deleteRecipe}>
                        <Trash2 size={12} /> Sil
                      </PlBtn>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {editableRules.map((rule: any) => {
                    const value = recipeForm.values[rule.key] || {};
                    return (
                      <div key={rule.key} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className="font-medium text-slate-900">{rule.label}</div>
                            <div className="text-[11px] text-slate-500">{rule.key} · {rule.behavior}</div>
                          </div>
                          {rule.required && <PlBadge tone="amber">Zorunlu</PlBadge>}
                        </div>

                        {rule.behavior === "REPLACE" && (
                          <PlInput
                            placeholder="Sabit değer"
                            value={value.value || ""}
                            onChange={(e) => setRecipeForm((current) => ({
                              ...current,
                              values: { ...current.values, [rule.key]: { ...value, value: e.target.value } },
                            }))}
                          />
                        )}

                        {rule.behavior === "PREFIX" && (
                          <PlInput
                            placeholder="Prefix"
                            value={value.prefix || ""}
                            onChange={(e) => setRecipeForm((current) => ({
                              ...current,
                              values: { ...current.values, [rule.key]: { ...value, prefix: e.target.value } },
                            }))}
                          />
                        )}

                        {rule.behavior === "SUFFIX" && (
                          <PlInput
                            placeholder="Suffix"
                            value={value.suffix || ""}
                            onChange={(e) => setRecipeForm((current) => ({
                              ...current,
                              values: { ...current.values, [rule.key]: { ...value, suffix: e.target.value } },
                            }))}
                          />
                        )}

                        {rule.behavior === "NUMBER_FORMULA" && (
                          <div className="grid md:grid-cols-4 gap-2">
                            <PlSelect
                              value={value.formulaType || "SET"}
                              onChange={(e) => setRecipeForm((current) => ({
                                ...current,
                                values: { ...current.values, [rule.key]: { ...value, formulaType: e.target.value } },
                              }))}
                            >
                              <option value="SET">Sabit Değer</option>
                              <option value="ADD">Topla</option>
                              <option value="MULTIPLY">Çarp</option>
                              <option value="PERCENT">Yüzde</option>
                            </PlSelect>
                            <PlInput
                              type="number"
                              placeholder="Değer"
                              value={value.formulaValue ?? ""}
                              onChange={(e) => setRecipeForm((current) => ({
                                ...current,
                                values: {
                                  ...current.values,
                                  [rule.key]: { ...value, formulaValue: Number(e.target.value || 0) },
                                },
                              }))}
                            />
                            <PlInput
                              type="number"
                              placeholder="Minimum"
                              value={value.minValue ?? ""}
                              onChange={(e) => setRecipeForm((current) => ({
                                ...current,
                                values: {
                                  ...current.values,
                                  [rule.key]: { ...value, minValue: Number(e.target.value || 0) },
                                },
                              }))}
                            />
                            <PlInput
                              type="number"
                              placeholder="Yuvarlama"
                              value={value.roundTo ?? ""}
                              onChange={(e) => setRecipeForm((current) => ({
                                ...current,
                                values: {
                                  ...current.values,
                                  [rule.key]: { ...value, roundTo: Number(e.target.value || 0) },
                                },
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PlCard>

              <div className="flex flex-wrap gap-2">
                <PlBtn variant="secondary" onClick={previewRecipe}>
                  <Eye size={12} /> Önizle
                </PlBtn>
                <PlBtn onClick={saveRecipe} disabled={recipeSaving}>
                  <Save size={12} /> {recipeForm.id ? "Reçeteyi Güncelle" : "Reçeteyi Kaydet"}
                </PlBtn>
                {recipeForm.id && (
                  <PlBtn onClick={queueRecipeToMarketplace} disabled={queueingRecipe}>
                    <Store size={12} /> {queueingRecipe ? "Kuyruğa Alınıyor" : "Mağazaya Gönder"}
                  </PlBtn>
                )}
                {recipeForm.id && (
                  <PlBtn
                    variant="secondary"
                    onClick={() => download(recipeModal.packageId, recipeForm.format, recipeModal.slug, recipeForm.id)}
                    disabled={downloading === `${recipeModal.packageId}-${recipeForm.format}-${recipeForm.id}`}
                  >
                    <Download size={12} /> {recipeForm.format} İndir
                  </PlBtn>
                )}
              </div>

              {recipePreview && (
                <PlCard className="p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Çıktı Önizlemesi</h4>
                  <p className="text-xs text-slate-500 mb-3">{recipePreview.itemCount} satır üretilecek</p>
                  {recipePreview.warnings?.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {recipePreview.warnings.map((warning: string) => (
                        <div key={warning} className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{warning}</div>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100">
                          {recipePreview.exportKeys?.map((key: string) => <th key={key} className="py-2 px-2 text-left">{key}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {recipePreview.sampleRows?.map((row: any, index: number) => (
                          <tr key={index} className="border-b border-slate-50">
                            {recipePreview.exportKeys?.map((key: string) => <td key={key} className="py-2 px-2">{String(row[key] ?? "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PlCard>
              )}
            </div>
          )
        )}
      </PlModal>
    </div>
  );
}
