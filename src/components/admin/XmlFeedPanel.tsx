"use client";

import { useCallback, useEffect, useState } from "react";
import { Rss } from "lucide-react";
import toast from "react-hot-toast";
import {
  getDefaultMappingsForTemplate,
  getDefaultRules,
  rulesFromForm,
  extraBrandAliasesToText,
} from "@/lib/products/xml-feed/mapping-fields";
import type { XmlFeedRules } from "@/lib/products/xml-feed/types";
import { XmlFeedCategoryStep } from "./xml-feed/XmlFeedCategoryStep";
import { XmlFeedDoneStep } from "./xml-feed/XmlFeedDoneStep";
import { XmlFeedListPanel } from "./xml-feed/XmlFeedListPanel";
import { XmlFeedMappingStep } from "./xml-feed/XmlFeedMappingStep";
import { XmlFeedPreviewStep } from "./xml-feed/XmlFeedPreviewStep";
import { initExtraBrandAliasesText, XmlFeedRulesStep } from "./xml-feed/XmlFeedRulesStep";
import { XmlFeedSetupStep } from "./xml-feed/XmlFeedSetupStep";
import { XmlFeedWizardSteps } from "./xml-feed/XmlFeedWizardSteps";
import type {
  XmlFeedListItem,
  XmlFeedTestState,
  XmlPreviewState,
  XmlSyncReport,
  XmlWizardStep,
} from "./xml-feed/types";

const LEYNA_PILOT_URL =
  "https://www.leyna.com.tr/export/1/a8564c17c365406e7d61aa34e6db9e9a31fb20b8";

function parseJsonRecord(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? (p as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function parseRules(raw: string | undefined | null): XmlFeedRules {
  if (!raw) return getDefaultRules();
  try {
    const p = JSON.parse(raw);
    return rulesFromForm({ ...getDefaultRules(), ...p }, extraBrandAliasesToText(p?.extraBrandAliases || []));
  } catch {
    return getDefaultRules();
  }
}

export function XmlFeedPanel() {
  const [step, setStep] = useState<XmlWizardStep>("setup");
  const [loading, setLoading] = useState(false);
  const [feeds, setFeeds] = useState<XmlFeedListItem[]>([]);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);

  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [name, setName] = useState("Leyna Feed");
  const [feedUrl, setFeedUrl] = useState(LEYNA_PILOT_URL);
  const [rootCategory, setRootCategory] = useState("Kadın İç Giyim");
  const [templateId, setTemplateId] = useState("leyna_v2");
  const [syncIntervalHours, setSyncIntervalHours] = useState(12);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [variantMapping, setVariantMapping] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<XmlFeedRules>(getDefaultRules());
  const [extraBrandAliasesText, setExtraBrandAliasesText] = useState("");

  const [testResult, setTestResult] = useState<XmlFeedTestState | null>(null);
  const [preview, setPreview] = useState<XmlPreviewState | null>(null);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [savedFeedId, setSavedFeedId] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<XmlSyncReport | null>(null);

  const loadFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products/xml-feeds");
      const data = await res.json();
      if (data.success) setFeeds(data.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadFeeds();
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data || d.categories || []) as Array<{ name: string } | string>;
        setStoreCategories(list.map((c) => (typeof c === "string" ? c : c.name)).filter(Boolean));
      })
      .catch(() => {});
  }, [loadFeeds]);

  const applyTemplateDefaults = useCallback((tid: string) => {
    const { mapping: m, variantMapping: vm } = getDefaultMappingsForTemplate(tid);
    setMapping(m);
    setVariantMapping(vm);
  }, []);

  useEffect(() => {
    if (!editingFeedId) {
      applyTemplateDefaults(templateId);
    }
  }, [templateId, editingFeedId, applyTemplateDefaults]);

  const handleTemplateChange = (tid: string) => {
    setTemplateId(tid);
    setTestResult(null);
    applyTemplateDefaults(tid);
  };

  const resetWizard = () => {
    setStep("setup");
    setEditingFeedId(null);
    setName("Leyna Feed");
    setFeedUrl(LEYNA_PILOT_URL);
    setRootCategory("Kadın İç Giyim");
    setTemplateId("leyna_v2");
    setSyncIntervalHours(12);
    applyTemplateDefaults("leyna_v2");
    setRules(getDefaultRules());
    setExtraBrandAliasesText("");
    setTestResult(null);
    setPreview(null);
    setCategoryMapping({});
    setSavedFeedId(null);
    setSyncReport(null);
  };

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/products/xml-feeds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl, templateId, mappingJson: mapping, variantMappingJson: variantMapping }),
      });
      const data = await res.json();
      if (!data.success && !data.data?.productCount) {
        toast.error(data.error || "Feed testi başarısız");
        setTestResult(data.data || {
          productCount: 0,
          categoryValues: [],
          brandValues: [],
          detectedFields: [],
          variantFields: [],
          sampleValues: {},
          error: data.error,
        });
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

  const runPreview = async () => {
    setLoading(true);
    try {
      const finalRules = rulesFromForm(rules, extraBrandAliasesText);
      const res = await fetch("/api/admin/products/xml-feeds/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl,
          rootCategory,
          templateId,
          mappingJson: mapping,
          variantMappingJson: variantMapping,
          categoryMappingJson: categoryMapping,
          rulesJson: finalRules,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Önizleme hatası");
        return false;
      }
      const p = data.data;
      setPreview({
        groups: (p.groups || []).map((g: XmlPreviewState["groups"][0]) => ({
          modelCode: g.modelCode,
          name: g.name,
          category: g.category,
          brand: g.brand,
          price: g.price,
          stock: g.stock,
          rows: g.rows,
          variantCount: g.rows?.length,
          errors: g.errors,
        })),
        categoryValues: p.categoryValues || [],
        totalRows: p.totalRows || 0,
        groupCount: p.groupCount || 0,
        unmappedCategories: p.unmappedCategories || [],
        errors: p.errors || [],
        parseErrors: p.parseErrors,
        suggestedCategoryMapping: p.suggestedCategoryMapping || {},
        appliedRules: p.appliedRules || finalRules,
      });
      setCategoryMapping((prev) => ({ ...p.suggestedCategoryMapping, ...prev }));
      setStep("preview");
      return true;
    } catch {
      toast.error("Önizleme oluşturulamadı");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSync = async () => {
    setLoading(true);
    try {
      const finalRules = rulesFromForm(rules, extraBrandAliasesText);
      const payload = {
        name,
        feedUrl,
        rootCategory,
        templateId,
        syncIntervalHours,
        mappingJson: mapping,
        variantMappingJson: variantMapping,
        categoryMappingJson: categoryMapping,
        rulesJson: finalRules,
      };

      let feedId = editingFeedId;
      if (editingFeedId) {
        const patchRes = await fetch(`/api/admin/products/xml-feeds/${editingFeedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const patchData = await patchRes.json();
        if (!patchData.success) {
          toast.error(patchData.error || "Güncelleme hatası");
          return;
        }
      } else {
        const createRes = await fetch("/api/admin/products/xml-feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const createData = await createRes.json();
        if (!createData.success) {
          toast.error(createData.error || "Feed kaydedilemedi");
          return;
        }
        feedId = createData.data.id as string;
      }

      setSavedFeedId(feedId);

      const syncRes = await fetch(`/api/admin/products/xml-feeds/${feedId}/sync`, { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncData.success) {
        toast.error(syncData.error || "Sync hatası");
        return;
      }
      setSyncReport(syncData.data);
      setStep("done");
      toast.success(`Sync: ${syncData.data.added} yeni, ${syncData.data.updated} güncellendi`);
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
      if (editingFeedId === feedId) resetWizard();
      loadFeeds();
    } catch {
      toast.error("Silme hatası");
    }
  };

  const handleEditFeed = async (feedId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/xml-feeds/${feedId}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Feed yüklenemedi");
        return;
      }
      const f = data.data;
      setEditingFeedId(f.id);
      setName(f.name);
      setFeedUrl(f.feedUrl);
      setRootCategory(f.rootCategory);
      setTemplateId(f.templateId);
      setSyncIntervalHours(f.syncIntervalHours);
      setMapping(parseJsonRecord(f.mappingJson));
      setVariantMapping(parseJsonRecord(f.variantMappingJson));
      const loadedRules = parseRules(f.rulesJson);
      setRules(loadedRules);
      setExtraBrandAliasesText(initExtraBrandAliasesText(loadedRules));
      try {
        setCategoryMapping(JSON.parse(f.categoryMappingJson || "{}"));
      } catch {
        setCategoryMapping({});
      }
      setTestResult({
        productCount: f.productCount,
        categoryValues: [],
        brandValues: [],
        detectedFields: Object.values(parseJsonRecord(f.mappingJson)),
        variantFields: Object.values(parseJsonRecord(f.variantMappingJson)),
        sampleValues: {},
      });
      setPreview(null);
      setSyncReport(null);
      setSavedFeedId(f.id);
      setStep("mapping");
      toast.success("Feed yüklendi — alan eşleme ve kuralları kontrol edin");
    } catch {
      toast.error("Feed yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

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
              Feed test → alan eşleme → kurallar → önizleme → kategori → sync. Admin düzenlemeleri korunur.
            </p>
          </div>
        </div>
      </div>

      <XmlFeedWizardSteps step={step} />

      {step === "setup" && (
        <>
          <XmlFeedSetupStep
            name={name}
            feedUrl={feedUrl}
            rootCategory={rootCategory}
            templateId={templateId}
            syncIntervalHours={syncIntervalHours}
            loading={loading}
            testResult={testResult}
            editingFeedId={editingFeedId}
            onNameChange={setName}
            onFeedUrlChange={setFeedUrl}
            onRootCategoryChange={setRootCategory}
            onTemplateIdChange={handleTemplateChange}
            onSyncIntervalChange={setSyncIntervalHours}
            onTest={handleTest}
            onNext={() => setStep("mapping")}
          />
          <XmlFeedListPanel
            feeds={feeds}
            loading={loading}
            onEdit={handleEditFeed}
            onSync={handleManualSync}
            onDelete={handleDeleteFeed}
          />
        </>
      )}

      {step === "mapping" && testResult && (
        <XmlFeedMappingStep
          templateId={templateId}
          mapping={mapping}
          variantMapping={variantMapping}
          detectedFields={testResult.detectedFields}
          variantFields={testResult.variantFields}
          onMappingChange={setMapping}
          onVariantMappingChange={setVariantMapping}
          onBack={() => setStep("setup")}
          onNext={() => setStep("rules")}
        />
      )}

      {step === "rules" && (
        <XmlFeedRulesStep
          rules={rules}
          extraBrandAliasesText={extraBrandAliasesText}
          onRulesChange={setRules}
          onExtraBrandAliasesTextChange={setExtraBrandAliasesText}
          onBack={() => setStep("mapping")}
          onNext={runPreview}
        />
      )}

      {step === "preview" && preview && (
        <XmlFeedPreviewStep
          preview={preview}
          rules={preview.appliedRules || rules}
          loading={loading}
          onBack={() => setStep("rules")}
          onRefresh={runPreview}
          onNext={() => setStep("categories")}
        />
      )}

      {step === "categories" && preview && (
        <XmlFeedCategoryStep
          categoryValues={preview.categoryValues}
          categoryMapping={categoryMapping}
          storeCategories={storeCategories}
          loading={loading}
          editingFeedId={editingFeedId}
          onCategoryMappingChange={setCategoryMapping}
          onBack={() => setStep("preview")}
          onSave={handleSaveAndSync}
        />
      )}

      {step === "done" && syncReport && (
        <XmlFeedDoneStep
          syncReport={syncReport}
          savedFeedId={savedFeedId}
          loading={loading}
          onNewFeed={resetWizard}
          onManualSync={handleManualSync}
        />
      )}
    </div>
  );
}
