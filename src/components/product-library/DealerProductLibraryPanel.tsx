"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package, Download, Layers, RefreshCw, ShoppingCart, Clock, CheckCircle2, Ban, History,
  Search, Eye, Filter,
} from "lucide-react";
import { plApi } from "./api";
import {
  PL_PANEL, PlAlert, PlBadge, PlBtn, PlCard, PlEmpty, PlHeader, PlInput, PlModal,
  PlSelect, PlStat, PlTabs, fmtDate, fmtMoney,
} from "./pl-ui";
import { UI } from "@/lib/ui/turkish-labels";

type DealerState = "ACCESSIBLE" | "PURCHASE" | "PENDING" | "INACTIVE";
type Tab = "packages" | "catalogs" | "history";

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

import { PaymentCheckoutPanel } from "@/components/payments/PaymentCheckoutPanel";

export default function DealerProductLibraryPanel() {
  const [tab, setTab] = useState<Tab>("packages");
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, pkgData] = await Promise.all([
        plApi<any[]>("/api/product-library/catalogs"),
        plApi<{ packages: any[]; tier: string; downloads: any[] }>("/api/product-library/my-packages"),
      ]);
      setCatalogs(cats);
      setPackages(pkgData.packages);
      setTier(pkgData.tier);
      setDownloads(pkgData.downloads || []);
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
  }), [packages, catalogs]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (stateFilter !== "ALL" && p.dealerState !== stateFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    });
  }, [packages, search, stateFilter]);

  const download = async (packageId: string, format: string, slug?: string) => {
    setDownloading(`${packageId}-${format}`);
    setError(null);
    try {
      const r = await fetch(`/api/product-library/package/${packageId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
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
      setSuccess(result.free ? "Ücretsiz paket erişiminiz açıldı" : "Satın alma talebiniz alındı — ödeme onayı bekleniyor");
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

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "packages", label: "Paketler", icon: Package },
    { id: "catalogs", label: "Kataloglar", icon: Layers },
    { id: "history", label: "İndirme Geçmişi", icon: History },
  ];

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PlStat label="Erişilebilir Paket" value={metrics.accessible} icon={CheckCircle2} />
        <PlStat label="Bekleyen Talep" value={metrics.pending} icon={Clock} />
        <PlStat label="Toplam Ürün" value={metrics.totalProducts} icon={Package} />
        <PlStat label="Katalog" value={metrics.catalogCount} icon={Layers} />
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
                        {p.dealerState === "ACCESSIBLE" && ["XML", "CSV", "EXCEL"].map((fmt) => (
                          <PlBtn
                            key={fmt}
                            variant="secondary"
                            size="sm"
                            onClick={() => download(p.id, fmt, p.slug)}
                            disabled={downloading === `${p.id}-${fmt}`}
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
                    <span>{d.package?.name || d.packageId} · <PlBadge tone="blue">{d.format}</PlBadge></span>
                    <span className="text-slate-500 text-xs">{fmtDate(d.createdAt)}</span>
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
          </div>
        )}
      </PlModal>
    </div>
  );
}
