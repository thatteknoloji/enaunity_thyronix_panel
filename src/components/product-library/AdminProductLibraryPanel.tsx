"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package, Layers, Truck, Box, Globe, FileSpreadsheet, Users, BarChart3, Search,
  Edit2, RefreshCw, Upload, Eye, Shield, Download,
} from "lucide-react";
import { plApi, type Paginated } from "./api";
import {
  PL_PANEL, PlAlert, PlBadge, PlBtn, PlCard, PlEmpty, PlHeader, PlInput, PlModal,
  PlSelect, PlStat, PlStatusBadge, PlTable, PlTabs, PlTextarea, fmtDate, fmtMoney,
} from "./pl-ui";
import { CATALOG_STATUSES, LICENSE_LEVELS } from "@/lib/product-library/types";
import { UI, billingTypeLabel, catalogFieldLabel, licenseLevelLabel, statusLabel } from "@/lib/ui/turkish-labels";

type Tab = "dashboard" | "catalogs" | "products" | "packages" | "suppliers" | "imports" | "distribution" | "access";

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "dashboard", label: UI.overview, icon: BarChart3 },
  { id: "catalogs", label: UI.catalogs, icon: Layers },
  { id: "products", label: "Ürün Tarayıcı", icon: Search },
  { id: "packages", label: UI.packages, icon: Box },
  { id: "suppliers", label: UI.suppliers, icon: Truck },
  { id: "imports", label: "İçe Aktarım", icon: Upload },
  { id: "distribution", label: "Dağıtım Logları", icon: Download },
  { id: "access", label: "Erişim Yönetimi", icon: Shield },
];

export default function AdminProductLibraryPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<any>(null);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [importJobs, setImportJobs] = useState<any[]>([]);
  const [distributionLogs, setDistributionLogs] = useState<any[]>([]);
  const [accessRows, setAccessRows] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);

  const [productQuery, setProductQuery] = useState({ catalogId: "", q: "", brand: "", category: "", status: "ACTIVE", page: 1 });
  const [productData, setProductData] = useState<Paginated<any> & { filters?: { brands: string[]; categories: string[] } } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [editCatalog, setEditCatalog] = useState<any>(null);
  const [editPackage, setEditPackage] = useState<any>(null);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [viewPackage, setViewPackage] = useState<any>(null);

  const [newCatalog, setNewCatalog] = useState({ name: "", description: "", status: "DRAFT" });
  const [newPackage, setNewPackage] = useState({
    name: "", description: "", catalogIds: [] as string[], licenseLevel: "FREE",
    monthlyPrice: 0, yearlyPrice: 0, oneTimePrice: 0, billingType: "FREE",
    badgeText: "", isFeatured: false, isNew: false, isBestSeller: false,
    isFree: true, thyronixReady: false, status: "ACTIVE",
  });
  const [newSupplier, setNewSupplier] = useState({
    name: "", type: "XML", contactName: "", contactEmail: "", xmlUrl: "", notes: "", catalogId: "", status: "ACTIVE",
  });
  const [grantAccess, setGrantAccess] = useState({ packageId: "", dealerId: "" });

  const [xmlForm, setXmlForm] = useState({ xmlUrl: "", name: "", category: "", catalogId: "", supplierName: "" });
  const [xmlTest, setXmlTest] = useState<any>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelCatalogId, setExcelCatalogId] = useState("");
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelMapping, setExcelMapping] = useState<Record<string, string>>({});

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (t === "dashboard") setDashboard(await plApi("/api/product-library/dashboard"));
      if (["catalogs", "products", "packages", "suppliers", "imports", "access"].includes(t)) {
        const cats = await plApi<any[]>("/api/product-library/catalogs");
        setCatalogs(cats);
      }
      if (t === "suppliers" || t === "imports") setSuppliers(await plApi("/api/product-library/suppliers"));
      if (t === "packages" || t === "access") setPackages(await plApi("/api/product-library/packages"));
      if (t === "imports") setImportJobs(await plApi("/api/product-library/import-jobs?limit=100"));
      if (t === "distribution") {
        setDistributionLogs(await plApi("/api/product-library/distribution-logs?scope=admin"));
      }
      if (t === "access") {
        const [access, dealerList] = await Promise.all([
          plApi<any[]>("/api/product-library/access"),
          plApi<any[]>("/api/admin/dealers"),
        ]);
        setAccessRows(access);
        setDealers(dealerList);
      }
      if (t === "products") {
        const params = new URLSearchParams();
        if (productQuery.catalogId) params.set("catalogId", productQuery.catalogId);
        if (productQuery.q) params.set("q", productQuery.q);
        if (productQuery.brand) params.set("brand", productQuery.brand);
        if (productQuery.category) params.set("category", productQuery.category);
        params.set("status", productQuery.status);
        params.set("page", String(productQuery.page));
        params.set("limit", "25");
        setProductData(await plApi(`/api/product-library/items?${params}`));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [productQuery]);

  useEffect(() => { load(tab); }, [tab, load]);

  const notify = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 5000); };

  const createCatalog = async () => {
    await plApi("/api/product-library/catalogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCatalog) });
    setNewCatalog({ name: "", description: "", status: "DRAFT" });
    notify("Katalog oluşturuldu");
    load("catalogs");
  };

  const saveCatalog = async () => {
    if (!editCatalog) return;
    await plApi(`/api/product-library/catalogs/${editCatalog.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatalog.name, description: editCatalog.description, status: editCatalog.status }),
    });
    setEditCatalog(null);
    notify("Katalog güncellendi");
    load("catalogs");
  };

  const createPackage = async () => {
    await plApi("/api/product-library/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPackage) });
    setNewPackage({ name: "", description: "", catalogIds: [], licenseLevel: "FREE", monthlyPrice: 0, yearlyPrice: 0, oneTimePrice: 0, billingType: "FREE", badgeText: "", isFeatured: false, isNew: false, isBestSeller: false, isFree: true, thyronixReady: false, status: "ACTIVE" });
    notify("Paket oluşturuldu");
    load("packages");
  };

  const savePackage = async () => {
    if (!editPackage) return;
    await plApi(`/api/product-library/packages/${editPackage.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editPackage),
    });
    setEditPackage(null);
    notify("Paket güncellendi");
    load("packages");
  };

  const openPackageDetail = async (id: string) => {
    try {
      setViewPackage(await plApi(`/api/product-library/packages/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detay yüklenemedi");
    }
  };

  const createSupplier = async () => {
    await plApi("/api/product-library/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSupplier) });
    setNewSupplier({ name: "", type: "XML", contactName: "", contactEmail: "", xmlUrl: "", notes: "", catalogId: "", status: "ACTIVE" });
    notify("Tedarikçi oluşturuldu");
    load("suppliers");
  };

  const saveSupplier = async () => {
    if (!editSupplier) return;
    await plApi(`/api/product-library/suppliers/${editSupplier.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editSupplier),
    });
    setEditSupplier(null);
    notify("Tedarikçi güncellendi");
    load("suppliers");
  };

  const resyncSupplier = async (id: string) => {
    const result = await plApi<any>(`/api/product-library/suppliers/${id}`, { method: "POST" });
    notify(`Senkron: ${result.addedCount} yeni, ${result.updatedCount} güncelleme`);
    load("suppliers");
    load("dashboard");
  };

  const testXml = async () => {
    setXmlTest(await plApi("/api/product-library/import/xml", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", xmlUrl: xmlForm.xmlUrl }),
    }));
  };

  const runXmlImport = async () => {
    const data = await plApi<any>("/api/product-library/import/xml", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...xmlForm, testOnly: false }),
    });
    notify(`XML: ${data.addedCount} yeni · ${data.updatedCount} güncelleme · ${data.durationMs}ms`);
    load("imports");
  };

  const previewExcel = async () => {
    if (!excelFile) return;
    const fd = new FormData();
    fd.append("file", excelFile);
    fd.append("previewOnly", "true");
    const data = await plApi<{ columns: string[] }>("/api/product-library/import/excel", { method: "POST", body: fd });
    setExcelColumns(data.columns);
    const map: Record<string, string> = {};
    for (const f of ["barcode", "sku", "name", "brand", "category", "price", "salePrice", "stock", "vatRate"]) {
      map[f] = data.columns.find((c) => c.toLowerCase() === f.toLowerCase()) || data.columns.find((c) => c.toLowerCase().includes(f)) || "";
    }
    setExcelMapping(map);
  };

  const runExcelImport = async () => {
    if (!excelFile || !excelCatalogId) return;
    const fd = new FormData();
    fd.append("file", excelFile);
    fd.append("catalogId", excelCatalogId);
    fd.append("mapping", JSON.stringify(excelMapping));
    const data = await plApi<any>("/api/product-library/import/excel", { method: "POST", body: fd });
    notify(`${data.sourceType}: ${data.addedCount} yeni · ${data.updatedCount} güncelleme`);
    load("imports");
  };

  const bulkProductStatus = async (status: string) => {
    if (!selectedProducts.length) return;
    await plApi("/api/product-library/items", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedProducts, status }),
    });
    setSelectedProducts([]);
    notify(`${selectedProducts.length} ürün güncellendi`);
    load("products");
  };

  const grantPackageAccess = async () => {
    await plApi("/api/product-library/access", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grantAccess),
    });
    setGrantAccess({ packageId: "", dealerId: "" });
    notify("Erişim verildi");
    load("access");
  };

  const revokeAccess = async (packageId: string, dealerId: string) => {
    await plApi("/api/product-library/access", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, dealerId }),
    });
    notify("Erişim iptal edildi");
    load("access");
  };

  const dashboardStats = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Katalog", value: dashboard.catalogCount, icon: Layers },
      { label: "Aktif Ürün", value: dashboard.productCount, icon: Package },
      { label: "Tedarikçi", value: dashboard.supplierCount, icon: Truck },
      { label: "Paket", value: dashboard.packageCount, icon: Box },
    ];
  }, [dashboard]);

  return (
    <div className={`${PL_PANEL} -m-4 md:-m-8 min-h-full bg-slate-50 p-4 md:p-8`}>
      <PlHeader
        title={UI.productLibraryAdmin}
        subtitle="Ürün havuzu, paketleme ve bayi dağıtımı — tam operasyon merkezi"
        onRefresh={() => load(tab)}
        loading={loading}
      />

      {error && <div className="mb-4"><PlAlert type="error">{error}</PlAlert></div>}
      {success && <div className="mb-4"><PlAlert type="success">{success}</PlAlert></div>}

      <PlTabs tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : (
        <>
          {tab === "dashboard" && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardStats.map((s) => <PlStat key={s.label} {...s} />)}
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <PlCard className="p-4">
                  <h3 className="font-semibold text-sm text-slate-800 mb-3">En Büyük Kataloglar</h3>
                  {dashboard.topCatalogs?.length ? dashboard.topCatalogs.map((c: any) => (
                    <div key={c.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm text-slate-700">
                      <span>{c.name}</span>
                      <PlBadge tone="blue">{c.productCount} ürün</PlBadge>
                    </div>
                  )) : <PlEmpty message="Henüz katalog yok" />}
                </PlCard>
                <PlCard className="p-4">
                  <h3 className="font-semibold text-sm text-slate-800 mb-3">Son İçe Aktarımlar</h3>
                  {dashboard.recentImports?.map((j: any) => (
                    <div key={j.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm text-slate-700">
                      <span className="truncate mr-2">{j.type} — {j.fileName || j.sourceUrl?.slice(0, 40)}</span>
                      <PlStatusBadge status={j.status} />
                    </div>
                  ))}
                </PlCard>
              </div>
              <PlCard className="p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Son İndirmeler</h3>
                {dashboard.recentDistributions?.map((l: any) => (
                  <div key={l.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm text-slate-700">
                    <span>{l.package?.name} — {l.format}</span>
                    <span className="text-slate-400 text-xs">{fmtDate(l.createdAt)}</span>
                  </div>
                ))}
              </PlCard>
            </div>
          )}

          {tab === "catalogs" && (
            <div className="space-y-4">
              <PlCard className="p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Yeni Katalog</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <PlInput placeholder="Ad (ör: Elektronik)" value={newCatalog.name} onChange={(e) => setNewCatalog({ ...newCatalog, name: e.target.value })} />
                  <PlInput placeholder="Açıklama" value={newCatalog.description} onChange={(e) => setNewCatalog({ ...newCatalog, description: e.target.value })} />
                  <PlSelect value={newCatalog.status} onChange={(e) => setNewCatalog({ ...newCatalog, status: e.target.value })}>
                    {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </PlSelect>
                </div>
                <PlBtn className="mt-3" onClick={createCatalog}>Oluştur</PlBtn>
              </PlCard>
              <PlCard className="divide-y divide-slate-100">
                {catalogs.map((c) => (
                  <div key={c.id} className="p-4 flex justify-between items-center gap-4">
                    <div>
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.productCount} ürün · {c.supplierCount} tedarikçi · {c.slug}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlStatusBadge status={c.status} />
                      <PlBtn variant="ghost" size="sm" onClick={() => setEditCatalog({ ...c })}><Edit2 size={14} /></PlBtn>
                      <PlBtn variant="ghost" size="sm" onClick={() => { setTab("products"); setProductQuery((q) => ({ ...q, catalogId: c.id, page: 1 })); }}>
                        <Eye size={14} /> Ürünler
                      </PlBtn>
                    </div>
                  </div>
                ))}
                {!catalogs.length && <PlEmpty message="Henüz katalog yok" />}
              </PlCard>
            </div>
          )}

          {tab === "products" && (
            <div className="space-y-4">
              <PlCard className="p-4">
                <div className="grid md:grid-cols-5 gap-3">
                  <PlSelect value={productQuery.catalogId} onChange={(e) => setProductQuery({ ...productQuery, catalogId: e.target.value, page: 1 })}>
                    <option value="">Tüm kataloglar</option>
                    {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </PlSelect>
                  <PlInput placeholder="Ara (ad, barkod, SKU…)" value={productQuery.q} onChange={(e) => setProductQuery({ ...productQuery, q: e.target.value })} />
                  <PlInput placeholder="Marka" value={productQuery.brand} onChange={(e) => setProductQuery({ ...productQuery, brand: e.target.value })} />
                  <PlSelect value={productQuery.status} onChange={(e) => setProductQuery({ ...productQuery, status: e.target.value, page: 1 })}>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Pasif</option>
                    <option value="ALL">Tümü</option>
                  </PlSelect>
                  <PlBtn onClick={() => load("products")}><Search size={14} /> Ara</PlBtn>
                </div>
                {selectedProducts.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    <PlBtn size="sm" variant="secondary" onClick={() => bulkProductStatus("ACTIVE")}>Seçilenleri Aktifleştir</PlBtn>
                    <PlBtn size="sm" variant="danger" onClick={() => bulkProductStatus("INACTIVE")}>Seçilenleri Pasifleştir</PlBtn>
                  </div>
                )}
              </PlCard>
              <PlCard className="overflow-hidden">
                <PlTable>
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="p-3 w-8"><input type="checkbox" checked={productData?.items?.length === selectedProducts.length && selectedProducts.length > 0} onChange={(e) => setSelectedProducts(e.target.checked ? (productData?.items || []).map((i: any) => i.id) : [])} /></th>
                      <th className="p-3">Ürün</th>
                      <th className="p-3">Marka</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Fiyat</th>
                      <th className="p-3">Stok</th>
                      <th className="p-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productData?.items?.map((item: any) => (
                      <tr key={item.id} className="text-slate-700 hover:bg-slate-50">
                        <td className="p-3"><input type="checkbox" checked={selectedProducts.includes(item.id)} onChange={(e) => setSelectedProducts(e.target.checked ? [...selectedProducts, item.id] : selectedProducts.filter((id) => id !== item.id))} /></td>
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.barcode || item.sku || "—"} · {item.catalog?.name}</div>
                        </td>
                        <td className="p-3">{item.brand || "—"}</td>
                        <td className="p-3">{item.category || "—"}</td>
                        <td className="p-3 tabular-nums">{fmtMoney(item.salePrice || item.price)}</td>
                        <td className="p-3 tabular-nums">{item.stock}</td>
                        <td className="p-3"><PlStatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </PlTable>
                {!productData?.items?.length && <PlEmpty message="Ürün bulunamadı" />}
                {productData && productData.totalPages > 1 && (
                  <div className="flex justify-between items-center p-3 border-t border-slate-100 text-sm text-slate-600">
                    <span>{productData.total} ürün · Sayfa {productData.page}/{productData.totalPages}</span>
                    <div className="flex gap-2">
                      <PlBtn size="sm" variant="secondary" disabled={productQuery.page <= 1} onClick={() => setProductQuery({ ...productQuery, page: productQuery.page - 1 })}>Önceki</PlBtn>
                      <PlBtn size="sm" variant="secondary" disabled={productQuery.page >= productData.totalPages} onClick={() => setProductQuery({ ...productQuery, page: productQuery.page + 1 })}>Sonraki</PlBtn>
                    </div>
                  </div>
                )}
              </PlCard>
            </div>
          )}

          {tab === "packages" && (
            <div className="space-y-4">
              <PlCard className="p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Yeni Paket</h3>
                <PackageForm value={newPackage} onChange={setNewPackage} catalogs={catalogs} />
                <PlBtn className="mt-3" onClick={createPackage}>Paket Oluştur</PlBtn>
              </PlCard>
              <PlCard className="divide-y divide-slate-100">
                {packages.map((p) => (
                  <div key={p.id} className="p-4 flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {p.name}
                        {p.badgeText && <PlBadge tone="violet">{p.badgeText}</PlBadge>}
                        {p.thyronixReady && <PlBadge tone="blue">THYRONIX</PlBadge>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{p.productCount} ürün · {licenseLevelLabel(p.licenseLevel)} · {billingTypeLabel(p.billingType)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlStatusBadge status={p.status} />
                      <PlBtn variant="ghost" size="sm" onClick={() => openPackageDetail(p.id)}><Eye size={14} /></PlBtn>
                      <PlBtn variant="ghost" size="sm" onClick={() => setEditPackage({ ...p, catalogIds: JSON.parse(p.catalogIds || "[]") })}><Edit2 size={14} /></PlBtn>
                    </div>
                  </div>
                ))}
              </PlCard>
            </div>
          )}

          {tab === "suppliers" && (
            <div className="space-y-4">
              <PlCard className="p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Yeni Tedarikçi</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <PlInput placeholder="Ad" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                  <PlInput placeholder="XML URL" value={newSupplier.xmlUrl} onChange={(e) => setNewSupplier({ ...newSupplier, xmlUrl: e.target.value })} />
                  <PlInput placeholder="İletişim" value={newSupplier.contactName} onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })} />
                  <PlInput placeholder="E-posta" value={newSupplier.contactEmail} onChange={(e) => setNewSupplier({ ...newSupplier, contactEmail: e.target.value })} />
                  <PlSelect value={newSupplier.catalogId} onChange={(e) => setNewSupplier({ ...newSupplier, catalogId: e.target.value })}>
                    <option value="">Katalog seç</option>
                    {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </PlSelect>
                  <PlInput placeholder="Notlar" value={newSupplier.notes} onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })} />
                </div>
                <PlBtn className="mt-3" onClick={createSupplier}>Tedarikçi Ekle</PlBtn>
              </PlCard>
              <PlCard className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <div key={s.id} className="p-4 flex justify-between items-center gap-4">
                    <div>
                      <div className="font-medium text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.type} · {s.catalog?.name || "—"} · {s.xmlUrl ? "XML bağlı" : "XML yok"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlStatusBadge status={s.status} />
                      {s.xmlUrl && (
                        <PlBtn variant="secondary" size="sm" onClick={() => resyncSupplier(s.id)}>
                          <RefreshCw size={12} /> Senkron
                        </PlBtn>
                      )}
                      <PlBtn variant="ghost" size="sm" onClick={() => setEditSupplier({ ...s })}><Edit2 size={14} /></PlBtn>
                    </div>
                  </div>
                ))}
              </PlCard>
            </div>
          )}

          {tab === "imports" && (
            <div className="grid lg:grid-cols-2 gap-4">
              <PlCard className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2"><Globe size={16} /> XML İçe Aktarım</h3>
                <PlInput placeholder="XML URL" value={xmlForm.xmlUrl} onChange={(e) => setXmlForm({ ...xmlForm, xmlUrl: e.target.value })} />
                <PlInput placeholder="Kaynak adı" value={xmlForm.name} onChange={(e) => setXmlForm({ ...xmlForm, name: e.target.value })} />
                <PlInput placeholder="Kategori (yeni katalog)" value={xmlForm.category} onChange={(e) => setXmlForm({ ...xmlForm, category: e.target.value })} />
                <PlSelect value={xmlForm.catalogId} onChange={(e) => setXmlForm({ ...xmlForm, catalogId: e.target.value })}>
                  <option value="">Mevcut katalog</option>
                  {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </PlSelect>
                <PlInput placeholder="Tedarikçi adı" value={xmlForm.supplierName} onChange={(e) => setXmlForm({ ...xmlForm, supplierName: e.target.value })} />
                <div className="flex gap-2">
                  <PlBtn variant="secondary" onClick={testXml}>Test Et</PlBtn>
                  <PlBtn onClick={runXmlImport}>Kaydet ve İçe Aktar</PlBtn>
                </div>
                {xmlTest && <p className="text-sm text-emerald-600">{xmlTest.productCount} ürün bulundu</p>}
              </PlCard>
              <PlCard className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2"><FileSpreadsheet size={16} /> Excel / CSV</h3>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="text-sm text-slate-700" />
                <PlSelect value={excelCatalogId} onChange={(e) => setExcelCatalogId(e.target.value)}>
                  <option value="">Katalog seç</option>
                  {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </PlSelect>
                <PlBtn variant="secondary" onClick={previewExcel}>Sütunları Önizle</PlBtn>
                {excelColumns.length > 0 && Object.keys(excelMapping).map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs w-24 text-slate-600">{catalogFieldLabel(field)}</span>
                    <PlSelect className="flex-1" value={excelMapping[field]} onChange={(e) => setExcelMapping({ ...excelMapping, [field]: e.target.value })}>
                      <option value="">—</option>
                      {excelColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </PlSelect>
                  </div>
                ))}
                <PlBtn onClick={runExcelImport}><Upload size={14} /> İçe Aktar</PlBtn>
              </PlCard>
              <PlCard className="p-4 lg:col-span-2">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">İçe Aktarım Geçmişi</h3>
                <PlTable>
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="p-2 text-left">Tarih</th>
                      <th className="p-2 text-left">Tip</th>
                      <th className="p-2 text-left">Kaynak</th>
                      <th className="p-2 text-right">Eklenen</th>
                      <th className="p-2 text-right">Güncellenen</th>
                      <th className="p-2 text-left">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {importJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="p-2 text-xs">{fmtDate(j.createdAt)}</td>
                        <td className="p-2">{j.type}</td>
                        <td className="p-2 truncate max-w-[200px]">{j.fileName || j.sourceUrl?.slice(0, 50)}</td>
                        <td className="p-2 text-right tabular-nums">{j.addedCount}</td>
                        <td className="p-2 text-right tabular-nums">{j.updatedCount}</td>
                        <td className="p-2"><PlStatusBadge status={j.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </PlTable>
              </PlCard>
            </div>
          )}

          {tab === "distribution" && (
            <PlCard className="overflow-hidden">
              <PlTable>
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Tarih</th>
                    <th className="p-3 text-left">Paket</th>
                    <th className="p-3 text-left">Format</th>
                    <th className="p-3 text-left">Bayi</th>
                    <th className="p-3 text-left">Kullanıcı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {distributionLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="p-3 text-xs">{fmtDate(l.createdAt)}</td>
                      <td className="p-3">{l.package?.name || l.packageId}</td>
                      <td className="p-3"><PlBadge tone="blue">{l.format}</PlBadge></td>
                      <td className="p-3 font-mono text-xs">{l.dealerId.slice(0, 8)}…</td>
                      <td className="p-3 text-xs">{l.userEmail || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </PlTable>
              {!distributionLogs.length && <PlEmpty message="Henüz dağıtım kaydı yok" />}
            </PlCard>
          )}

          {tab === "access" && (
            <div className="space-y-4">
              <PlCard className="p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2"><Users size={16} /> Manuel Erişim Ver</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <PlSelect value={grantAccess.packageId} onChange={(e) => setGrantAccess({ ...grantAccess, packageId: e.target.value })}>
                    <option value="">Paket seç</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </PlSelect>
                  <PlSelect value={grantAccess.dealerId} onChange={(e) => setGrantAccess({ ...grantAccess, dealerId: e.target.value })}>
                    <option value="">Bayi seç</option>
                    {dealers.map((d) => <option key={d.id} value={d.id}>{d.company || d.name} ({d.email})</option>)}
                  </PlSelect>
                  <PlBtn onClick={grantPackageAccess} disabled={!grantAccess.packageId || !grantAccess.dealerId}>Erişim Ver</PlBtn>
                </div>
              </PlCard>
              <PlCard className="overflow-hidden">
                <PlTable>
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="p-3 text-left">Bayi</th>
                      <th className="p-3 text-left">Paket</th>
                      <th className="p-3 text-left">Verildi</th>
                      <th className="p-3 text-left">Durum</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {accessRows.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3">{r.dealer?.company || r.dealer?.name || r.dealerId}</td>
                        <td className="p-3">{r.package?.name || r.packageId}</td>
                        <td className="p-3 text-xs">{fmtDate(r.grantedAt)}</td>
                        <td className="p-3"><PlStatusBadge status={r.status} /></td>
                        <td className="p-3">
                          {r.status === "ACTIVE" && (
                            <PlBtn variant="danger" size="sm" onClick={() => revokeAccess(r.packageId, r.dealerId)}>İptal</PlBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </PlTable>
              </PlCard>
            </div>
          )}
        </>
      )}

      <PlModal open={!!editCatalog} onClose={() => setEditCatalog(null)} title="Katalog Düzenle">
        {editCatalog && (
          <div className="space-y-3">
            <PlInput value={editCatalog.name} onChange={(e) => setEditCatalog({ ...editCatalog, name: e.target.value })} />
            <PlTextarea value={editCatalog.description} onChange={(e) => setEditCatalog({ ...editCatalog, description: e.target.value })} />
            <PlSelect value={editCatalog.status} onChange={(e) => setEditCatalog({ ...editCatalog, status: e.target.value })}>
              {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </PlSelect>
            <PlBtn onClick={saveCatalog}>Kaydet</PlBtn>
          </div>
        )}
      </PlModal>

      <PlModal open={!!editPackage} onClose={() => setEditPackage(null)} title="Paket Düzenle" wide>
        {editPackage && (
          <div className="space-y-3">
            <PackageForm value={editPackage} onChange={setEditPackage} catalogs={catalogs} />
            <PlBtn onClick={savePackage}>Kaydet</PlBtn>
          </div>
        )}
      </PlModal>

      <PlModal open={!!editSupplier} onClose={() => setEditSupplier(null)} title="Tedarikçi Düzenle">
        {editSupplier && (
          <div className="space-y-3">
            <PlInput value={editSupplier.name} onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })} />
            <PlInput value={editSupplier.xmlUrl} onChange={(e) => setEditSupplier({ ...editSupplier, xmlUrl: e.target.value })} />
            <PlInput value={editSupplier.contactEmail} onChange={(e) => setEditSupplier({ ...editSupplier, contactEmail: e.target.value })} />
            <PlSelect value={editSupplier.catalogId || ""} onChange={(e) => setEditSupplier({ ...editSupplier, catalogId: e.target.value })}>
              <option value="">Katalog</option>
              {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </PlSelect>
            <PlSelect value={editSupplier.status} onChange={(e) => setEditSupplier({ ...editSupplier, status: e.target.value })}>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </PlSelect>
            <PlBtn onClick={saveSupplier}>Kaydet</PlBtn>
          </div>
        )}
      </PlModal>

      <PlModal open={!!viewPackage} onClose={() => setViewPackage(null)} title={viewPackage?.package?.name || "Paket Detayı"} wide>
        {viewPackage && (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="grid grid-cols-3 gap-3">
              <PlStat label="Ürün" value={viewPackage.productCount} icon={Package} />
              <PlStat label="Erişim" value={viewPackage.accessCount} icon={Users} />
              <PlStat label="İndirme" value={viewPackage.downloadCount} icon={Download} />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Kataloglar</h4>
              <div className="flex flex-wrap gap-2">
                {viewPackage.catalogs?.map((c: any) => <PlBadge key={c.id} tone="blue">{c.name}</PlBadge>)}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Örnek Ürünler</h4>
              {viewPackage.previewItems?.map((i: any) => (
                <div key={i.id} className="py-1 border-b border-slate-100 text-xs">{i.name} — {i.brand} — {fmtMoney(i.price)}</div>
              ))}
            </div>
          </div>
        )}
      </PlModal>
    </div>
  );
}

function PackageForm({ value, onChange, catalogs }: { value: any; onChange: (v: any) => void; catalogs: any[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <PlInput placeholder="Paket adı" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <PlSelect value={value.licenseLevel} onChange={(e) => onChange({ ...value, licenseLevel: e.target.value })}>
        {LICENSE_LEVELS.map((l) => <option key={l} value={l}>{licenseLevelLabel(l)}</option>)}
      </PlSelect>
      <PlTextarea className="md:col-span-2" placeholder="Açıklama" value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
      <PlSelect
        multiple
        className="md:col-span-2 h-24"
        value={value.catalogIds}
        onChange={(e) => onChange({ ...value, catalogIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
      >
        {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </PlSelect>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={value.isFree} onChange={(e) => onChange({ ...value, isFree: e.target.checked, billingType: e.target.checked ? "FREE" : value.billingType })} /> Ücretsiz
      </label>
      <PlSelect value={value.billingType} onChange={(e) => onChange({ ...value, billingType: e.target.value })}>
        {["FREE", "ONE_TIME", "MONTHLY", "YEARLY"].map((b) => <option key={b} value={b}>{billingTypeLabel(b)}</option>)}
      </PlSelect>
      <PlInput type="number" placeholder="Tek seferlik" value={value.oneTimePrice} onChange={(e) => onChange({ ...value, oneTimePrice: Number(e.target.value) })} />
      <PlInput type="number" placeholder="Aylık" value={value.monthlyPrice} onChange={(e) => onChange({ ...value, monthlyPrice: Number(e.target.value) })} />
      <PlInput type="number" placeholder="Yıllık" value={value.yearlyPrice} onChange={(e) => onChange({ ...value, yearlyPrice: Number(e.target.value) })} />
      <PlInput placeholder="Rozet metni" value={value.badgeText} onChange={(e) => onChange({ ...value, badgeText: e.target.value })} />
      <PlSelect value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
        <option value="ACTIVE">Aktif</option>
        <option value="INACTIVE">Pasif</option>
        <option value="DRAFT">Taslak</option>
      </PlSelect>
      {["isFeatured", "isNew", "isBestSeller", "thyronixReady"].map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.checked })} />
          {key === "isFeatured" ? "Öne çıkan" : key === "isNew" ? "Yeni" : key === "isBestSeller" ? "Çok satan" : "THYRONIX Hazır"}
        </label>
      ))}
    </div>
  );
}
