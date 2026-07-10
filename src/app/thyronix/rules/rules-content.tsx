"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2, Eye, Layers, Package, ShieldCheck, Sparkles, CheckCircle, XCircle, Tag, Info, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  DEFAULT_FEED_TRANSFORM,
  DEFAULT_AUTOMATION,
  type ThyronixAutomationSettings,
  type ThyronixFeedTransformSettings,
} from "@/lib/thyronix/commercial";
import type {
  ThyronixAiRules,
  ThyronixGateRules,
  ThyronixPriceRules,
  ThyronixPriceTier,
  ThyronixStockRules,
} from "@/lib/thyronix/rules/types";
import {
  DEFAULT_THYRONIX_AI_RULES,
  DEFAULT_THYRONIX_GATE_RULES,
  DEFAULT_THYRONIX_PRICE_RULES,
  DEFAULT_THYRONIX_STOCK_RULES,
} from "@/lib/thyronix/rules/types";

type RulesProfile = {
  id: string;
  name: string;
  scope: string;
  isDefault: boolean;
  price: ThyronixPriceRules;
  stock: ThyronixStockRules;
  gate: ThyronixGateRules;
  ai: ThyronixAiRules;
  sourceCount?: number;
};

type SourceRow = {
  id: string;
  name: string;
  useCustomRules?: boolean;
  rulesProfileId?: string | null;
};

type PendingChange = {
  id: string;
  profileId: string;
  proposed: {
    price: ThyronixPriceRules;
    stock: ThyronixStockRules;
    gate: ThyronixGateRules;
    ai: ThyronixAiRules;
  };
  preview: PreviewData | null;
  createdAt: string;
};

type PreviewData = {
  price: { total: number; wouldChange: number; sample: Array<{ name: string; before: number; after: number }> };
  output: {
    total: number;
    hiddenByStock: number;
    hiddenByGate: number;
    included: number;
    excludedSample: Array<{ name: string; reason: string; stock?: number }>;
  };
};

const emptyTier = (): ThyronixPriceTier => ({ minPrice: 0, maxPrice: null, markupPercent: 0 });

const inputClass =
  "mt-1 w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50";
const labelClass = "text-xs text-nexa-text-secondary block";

function stockFilterLabel(hideBelowStock: number | null): string {
  if (hideBelowStock == null) return "Kapalı — stok 0 dahil tüm ürünler çıktı XML'de";
  if (hideBelowStock === 1) return "Açık — stok 0 olan ürünler çıktıdan gizlenir";
  return `Açık — stok ${hideBelowStock} altındaki ürünler çıktıdan gizlenir`;
}

function priceRuleLabel(multiplier: number): string {
  if (multiplier === 1) return "Orijinal — kaynak XML fiyatı aynen çıkar";
  return `Çarpan ${multiplier} — fiyat kaynağın ${multiplier} katı`;
}

export default function ThyronixRulesContent() {
  const [dealerId, setDealerId] = useState("");
  const [dealerInput, setDealerInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalProfile, setGlobalProfile] = useState<RulesProfile | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [price, setPrice] = useState<ThyronixPriceRules>({ ...DEFAULT_THYRONIX_PRICE_RULES });
  const [stock, setStock] = useState<ThyronixStockRules>({ ...DEFAULT_THYRONIX_STOCK_RULES });
  const [gate, setGate] = useState<ThyronixGateRules>({ ...DEFAULT_THYRONIX_GATE_RULES });
  const [ai, setAi] = useState<ThyronixAiRules>({ ...DEFAULT_THYRONIX_AI_RULES });
  const [aiSourceId, setAiSourceId] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [approving, setApproving] = useState(false);
  const [workspaceAutomation, setWorkspaceAutomation] = useState<ThyronixAutomationSettings>({ ...DEFAULT_AUTOMATION });
  const [feedTransform, setFeedTransform] = useState<ThyronixFeedTransformSettings>({ ...DEFAULT_FEED_TRANSFORM });
  const [savingBrand, setSavingBrand] = useState(false);
  const rulesNotifiedRef = useRef<string | null>(null);
  const stockInputBaselineRef = useRef<number | null | undefined>(undefined);

  const notifyStockFilterChange = (next: number | null, source: "preset" | "input" = "preset") => {
    if (source === "preset") {
      setStock((prev) => ({ ...prev, hideBelowStock: next }));
    }
    if (next == null) {
      toast(
        "Stok filtresi KAPALI — stok 0 dahil tüm ürünler çıktı XML'de görünür. Kaydetmek için «Onaya Gönder».",
        { duration: 6000, icon: "✓" },
      );
      return;
    }
    const msg =
      next === 1
        ? "Stok filtresi AÇILDI — stok 0 olan ürünler çıktı XML'den gizlenecek. Kaydetmek için «Onaya Gönder»."
        : `Stok filtresi AÇILDI — stok ${next} altındaki ürünler çıktıdan gizlenecek. Kaydetmek için «Onaya Gönder».`;
    toast(msg, { duration: 6000, icon: "⚠" });
  };

  const applyFormFromProfile = (profile: RulesProfile) => {
    setPrice(profile.price);
    setStock(profile.stock);
    setGate(profile.gate);
    setAi({ ...DEFAULT_THYRONIX_AI_RULES, ...profile.ai });
  };

  const loadRules = useCallback(async () => {
    if (!dealerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [globalRes, sourcesRes] = await Promise.all([
        fetch(`/api/thyronix/rules/profiles?scope=global&dealerId=${encodeURIComponent(dealerId)}`),
        fetch("/api/thyronix/sources"),
      ]);
      const globalData = await globalRes.json();
      const sourcesData = await sourcesRes.json();

      if (globalData.success) {
        const profile = globalData.data as RulesProfile;
        setGlobalProfile(profile);

        const pendingRes = await fetch(
          `/api/thyronix/rules/profiles/${profile.id}/pending?dealerId=${encodeURIComponent(dealerId)}`,
        );
        const pendingData = await pendingRes.json();

        if (pendingData.success && pendingData.data) {
          const p = pendingData.data as PendingChange;
          setPendingChange(p);
          if (p.proposed) {
            setPrice(p.proposed.price);
            setStock(p.proposed.stock);
            setGate(p.proposed.gate);
            setAi({ ...DEFAULT_THYRONIX_AI_RULES, ...p.proposed.ai });
          }
          setPreview(p.preview);
        } else {
          setPendingChange(null);
          applyFormFromProfile(profile);
          setPreview(null);
        }
      }
      if (sourcesData.success) setSources(sourcesData.data);
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  const loadWorkspace = useCallback(async () => {
    const ws = await fetch("/api/thyronix/workspace").then((r) => r.json());
    if (ws.success && ws.data?.dealerId) {
      setDealerId(ws.data.dealerId);
      if (ws.data.automation) {
        setWorkspaceAutomation(ws.data.automation);
        setFeedTransform({
          ...DEFAULT_FEED_TRANSFORM,
          ...(ws.data.automation.feedTransform || {}),
        });
      }
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useEffect(() => {
    if (loading || !dealerId || pendingChange) return;
    if (rulesNotifiedRef.current === dealerId) return;
    rulesNotifiedRef.current = dealerId;

    const stockMsg = stockFilterLabel(stock.hideBelowStock);
    const priceMsg = priceRuleLabel(price.multiplier);
    const brandMsg = feedTransform.enabled && feedTransform.targetBrand.trim()
      ? `Marka dönüşümü: «${feedTransform.targetBrand.trim()}»`
      : "Marka dönüşümü kapalı — kaynak markalar aynen";

    toast(
      (t) => (
        <div className="text-sm leading-snug max-w-sm">
          <p className="font-semibold mb-1">Aktif çıktı kuralları</p>
          <p>• Fiyat: {priceMsg}</p>
          <p>• Stok: {stockMsg}</p>
          <p>• {brandMsg}</p>
        </div>
      ),
      { duration: 8000, id: `thyronix-rules-status-${dealerId}` },
    );
  }, [loading, dealerId, pendingChange, stock.hideBelowStock, price.multiplier, feedTransform.enabled, feedTransform.targetBrand]);

  const handleProposeChange = async () => {
    if (!globalProfile) return;
    setSaving(true);
    const res = await fetch(`/api/thyronix/rules/profiles/${globalProfile.id}/pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, price, stock, gate, ai }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      toast.success("Değişiklik onay bekliyor — inceleyip onaylayın");
      setPendingChange(data.data.pending);
      if (data.data.preview) setPreview(data.data.preview);
    } else {
      toast.error(data.error || "Kayıt hatası");
    }
  };

  const handleApproveChange = async () => {
    if (!globalProfile || !pendingChange) return;
    if (!confirm("Kural değişikliği tüm etkilenen ürünlere uygulanacak. Onaylıyor musunuz?")) return;
    setApproving(true);
    const res = await fetch(`/api/thyronix/rules/profiles/${globalProfile.id}/pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, action: "approve", changeId: pendingChange.id }),
    });
    const data = await res.json();
    setApproving(false);
    if (data.success) {
      const r = data.data.applyResult;
      toast.success(`Uygulandı: ${r.priceUpdated} fiyat, ${r.contentUpdated} içerik güncellendi`);
      toast(stockFilterLabel(data.data.profile.stock.hideBelowStock), {
        duration: 6000,
        icon: data.data.profile.stock.hideBelowStock == null ? "✓" : "⚠",
      });
      setGlobalProfile(data.data.profile);
      setPendingChange(null);
      applyFormFromProfile(data.data.profile);
    } else {
      toast.error(data.error || "Onay hatası");
    }
  };

  const handleCancelPending = async () => {
    if (!globalProfile) return;
    const res = await fetch(
      `/api/thyronix/rules/profiles/${globalProfile.id}/pending?dealerId=${encodeURIComponent(dealerId)}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    if (data.success) {
      toast.success("Bekleyen değişiklik iptal edildi");
      setPendingChange(null);
      setPreview(null);
      if (globalProfile) applyFormFromProfile(globalProfile);
    }
  };

  const handleSaveGlobal = handleProposeChange;

  const handleSaveFeedTransform = async () => {
    if (!dealerId) return;
    if (feedTransform.enabled && !feedTransform.targetBrand.trim()) {
      toast.error("Çıktı markası etkinse hedef marka adı gerekli");
      return;
    }
    setSavingBrand(true);
    const res = await fetch("/api/thyronix/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        automation: {
          ...workspaceAutomation,
          feedTransform,
        },
      }),
    });
    const data = await res.json();
    setSavingBrand(false);
    if (data.success) {
      if (data.data?.automation) {
        setWorkspaceAutomation(data.data.automation);
        setFeedTransform({ ...DEFAULT_FEED_TRANSFORM, ...(data.data.automation.feedTransform || {}) });
      }
      toast.success("Çıktı markası kaydedildi — bir sonraki feed üretiminde geçerli olur");
    } else {
      toast.error(data.error || "Marka ayarı kaydedilemedi");
    }
  };

  const handlePreview = async () => {
    if (!dealerId) return;
    toast.loading("Önizleme hesaplanıyor...");
    const res = await fetch("/api/thyronix/rules/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, price, stock, gate }),
    });
    const data = await res.json();
    toast.dismiss();
    if (data.success) {
      setPreview(data.data);
      toast.success("Önizleme hazır");
    } else {
      toast.error(data.error || "Önizleme hatası");
    }
  };

  const updateTier = (index: number, patch: Partial<ThyronixPriceTier>) => {
    setPrice((prev) => {
      const tiers = [...prev.tiers];
      tiers[index] = { ...tiers[index], ...patch };
      return { ...prev, tiers };
    });
  };

  const toggleSourceCustomRules = async (source: SourceRow, useCustom: boolean, profileId?: string) => {
    const res = await fetch(`/api/thyronix/sources/${source.id}/rules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCustomRules: useCustom, rulesProfileId: profileId || null }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(useCustom ? "Kaynak özel kuralları aktif" : "Genel kurallar kullanılıyor");
      loadRules();
    } else {
      toast.error(data.error || "Güncelleme hatası");
    }
  };

  const createSourceProfile = async (source: SourceRow) => {
    const res = await fetch("/api/thyronix/rules/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, name: `${source.name} Kuralları`, copyFromGlobal: true }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Profil oluşturulamadı");
      return;
    }
    await toggleSourceCustomRules(source, true, data.data.id);
  };

  const handleApplyTemplate = async () => {
    if (!dealerId) return;
    setAiRunning(true);
    toast.loading("Şablon kuralları uygulanıyor...");
    const res = await fetch("/api/thyronix/rules/ai/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "template",
        dealerId,
        sourceId: aiSourceId || undefined,
        limit: 500,
      }),
    });
    const data = await res.json();
    toast.dismiss();
    setAiRunning(false);
    if (data.success) {
      toast.success(`${data.data.updated} ürün güncellendi (marka/prefix/yasaklı kelime)`);
    } else {
      toast.error(data.error || "Uygulama hatası");
    }
  };

  const handleApplyAi = async () => {
    if (!dealerId) return;
    if (!ai.enabled) {
      toast.error("Önce AI kurallarını etkinleştirin ve kaydedin");
      return;
    }
    if (!confirm("Seçili kapsamdaki ürünlerde AI ile başlık/açıklama üretilecek. API maliyeti oluşabilir. Devam?")) {
      return;
    }
    setAiRunning(true);
    toast.loading("AI içerik üretiliyor (max 30 ürün)...");
    const res = await fetch("/api/thyronix/rules/ai/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai",
        dealerId,
        sourceId: aiSourceId || undefined,
        fields: ["name", "description"],
        maxItems: 30,
      }),
    });
    const data = await res.json();
    toast.dismiss();
    setAiRunning(false);
    if (data.success) {
      toast.success(`${data.data.updated} ürün AI ile güncellendi`);
    } else {
      toast.error(data.error || "AI hatası");
    }
  };

  if (!dealerId) {
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Kurallar</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">
            Fiyat, stok ve kalite kurallarını buradan yönetin. Admin: hedef bayi ID girin.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={dealerInput}
            onChange={(e) => setDealerInput(e.target.value)}
            placeholder="Bayi ID (dealerId)"
            className="flex-1 rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm"
          />
          <button
            onClick={() => dealerInput.trim() && setDealerId(dealerInput.trim())}
            className="px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg"
          >
            Yükle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Kurallar</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">
            Değişiklikler önce onaya gider; onaydan sonra mevcut ürünlere uygulanır. Sync sırasında aktif kurallar geçerlidir.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-3 py-2 border border-nexa-border text-sm rounded-lg hover:bg-nexa-hover"
          >
            <Eye size={14} /> Önizle
          </button>
          <button
            onClick={handleSaveGlobal}
            disabled={saving || !globalProfile}
            className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Gönderiliyor..." : "Onaya Gönder"}
          </button>
        </div>
      </div>

      {pendingChange && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-medium text-amber-200 text-sm flex items-center gap-2">
              <Eye size={14} /> Onay bekleyen kural değişikliği
            </p>
            <p className="text-xs text-nexa-text-secondary mt-1">
              {pendingChange.preview
                ? `${pendingChange.preview.price.wouldChange} fiyat değişecek · ${pendingChange.preview.output.hiddenByStock + pendingChange.preview.output.hiddenByGate} çıktıdan gizlenecek`
                : "Önizleme için Onaya Gönder sonrası veriler yüklenir"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCancelPending}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-nexa-border hover:bg-nexa-hover"
            >
              <XCircle size={14} /> İptal
            </button>
            <button
              onClick={handleApproveChange}
              disabled={approving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle size={14} /> {approving ? "Uygulanıyor..." : "Onayla ve Uygula"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-nexa-text-secondary text-sm">Yükleniyor...</p>
      ) : (
        <>
          {/* Aktif kurallar özeti — her zaman görünür */}
          <div
            className={`rounded-xl border-2 p-4 space-y-3 ${
              stock.hideBelowStock == null
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-amber-500/50 bg-amber-500/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {stock.hideBelowStock == null ? (
                <Info size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <p className="font-semibold text-nexa-text text-sm">Şu an çıktı XML&apos;de geçerli kurallar</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-nexa-bg/60 border border-nexa-border px-3 py-2">
                    <span className="text-nexa-text-secondary block mb-0.5">Fiyat</span>
                    <span className="text-nexa-text font-medium">{priceRuleLabel(price.multiplier)}</span>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      stock.hideBelowStock == null
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    <span className="text-nexa-text-secondary block mb-0.5">Stok filtresi</span>
                    <span className={`font-medium ${stock.hideBelowStock == null ? "text-emerald-300" : "text-amber-200"}`}>
                      {stockFilterLabel(stock.hideBelowStock)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-nexa-bg/60 border border-nexa-border px-3 py-2">
                    <span className="text-nexa-text-secondary block mb-0.5">Kalite kapısı</span>
                    <span className="text-nexa-text font-medium">
                      {Object.values(gate).some(Boolean) ? "Bazı kontroller açık" : "Kapalı — eksik alanlı ürünler de çıkar"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-nexa-bg/60 border border-nexa-border px-3 py-2">
                    <span className="text-nexa-text-secondary block mb-0.5">Çıktı markası</span>
                    <span className="text-nexa-text font-medium">
                      {feedTransform.enabled && feedTransform.targetBrand.trim()
                        ? `«${feedTransform.targetBrand.trim()}» olarak yayınlanır`
                        : "Kapalı — kaynak marka aynen"}
                    </span>
                  </div>
                </div>
                {stock.hideBelowStock != null && (
                  <p className="text-[11px] text-amber-200/90">
                    Stok filtresi açıkken çıktı XML&apos;deki ürün sayısı kaynak XML&apos;den az olabilir. Tüm ürünlerin çıkması için stok filtresini kapatın.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Fiyat */}
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-nexa-primary" />
              <div>
                <h2 className="font-semibold text-nexa-text">Fiyat Motoru</h2>
                <p className="text-xs text-nexa-text-secondary">
                  Çarpan <strong className="font-medium text-nexa-text">1</strong> = kaynak XML fiyatı aynen çıkar. Zam veya indirim için çarpanı değiştirin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className={labelClass}>
                Mod
                <select
                  value={price.mode}
                  onChange={(e) => setPrice({ ...price, mode: e.target.value as "flat" | "tiered" })}
                  className={inputClass}
                >
                  <option value="flat">Sabit çarpan + TL</option>
                  <option value="tiered">Kademeli markup</option>
                </select>
              </label>
              <label className={labelClass}>
                Baz alan
                <select
                  value={price.baseField}
                  onChange={(e) =>
                    setPrice({ ...price, baseField: e.target.value as ThyronixPriceRules["baseField"] })
                  }
                  className={inputClass}
                >
                  <option value="price">Feed satış fiyatı</option>
                  <option value="costPrice">Alış / maliyet</option>
                  <option value="discountedPrice">İndirimli fiyat</option>
                </select>
              </label>
              {price.mode === "flat" && (
                <>
                  <label className={labelClass}>
                    Çarpan (1.20 = %20 zam)
                    <input
                      type="number"
                      step="0.01"
                      value={price.multiplier}
                      onChange={(e) => setPrice({ ...price, multiplier: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Sabit TL ekle
                    <input
                      type="number"
                      step="0.01"
                      value={price.fixedAdjustment}
                      onChange={(e) => setPrice({ ...price, fixedAdjustment: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </label>
                </>
              )}
              <label className={labelClass}>
                Yuvarlama (ör. 0.99 → 1 TL)
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={price.roundTo}
                  onChange={(e) => setPrice({ ...price, roundTo: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
            </div>

            {price.mode === "tiered" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-nexa-text-secondary">Fiyat aralığına göre markup %</p>
                  <button
                    onClick={() => setPrice({ ...price, tiers: [...price.tiers, emptyTier()] })}
                    className="text-xs text-nexa-primary flex items-center gap-1"
                  >
                    <Plus size={12} /> Kademe ekle
                  </button>
                </div>
                {price.tiers.length === 0 && (
                  <p className="text-xs text-nexa-warning">En az bir kademe ekleyin</p>
                )}
                {price.tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <input type="number" placeholder="Min TL" value={tier.minPrice} onChange={(e) => updateTier(i, { minPrice: Number(e.target.value) })} className={inputClass} />
                    <input type="number" placeholder="Max (boş=∞)" value={tier.maxPrice ?? ""} onChange={(e) => updateTier(i, { maxPrice: e.target.value ? Number(e.target.value) : null })} className={inputClass} />
                    <input type="number" placeholder="Markup %" value={tier.markupPercent} onChange={(e) => updateTier(i, { markupPercent: Number(e.target.value) })} className={inputClass} />
                    <button onClick={() => setPrice({ ...price, tiers: price.tiers.filter((_, j) => j !== i) })} className="text-nexa-danger p-1 mb-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stok */}
          <div
            className={`rounded-xl border p-6 space-y-4 ${
              stock.hideBelowStock == null
                ? "border-emerald-500/30 bg-nexa-card"
                : "border-amber-500/40 bg-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <Package size={16} className="text-amber-500" />
              <div className="flex-1">
                <h2 className="font-semibold text-nexa-text">Stok / Yayın Motoru</h2>
                <p className="text-xs text-nexa-text-secondary">
                  Bu ayar çıktı XML&apos;de hangi ürünlerin görüneceğini belirler. Veritabanındaki gerçek stok değişmez.
                </p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                  stock.hideBelowStock == null
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                }`}
              >
                {stock.hideBelowStock == null ? "Filtre kapalı" : "Filtre açık"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => notifyStockFilterChange(null)}
                className={`flex-1 text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  stock.hideBelowStock == null
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/50"
                    : "border-nexa-border hover:bg-nexa-hover text-nexa-text"
                }`}
              >
                <span className="font-medium block">Stok filtresi kapalı</span>
                <span className="text-[11px] opacity-80 mt-0.5 block">Stok 0 dahil — kaynak XML ile aynı ürün seti çıkar</span>
              </button>
              <button
                type="button"
                onClick={() => notifyStockFilterChange(1)}
                className={`flex-1 text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  stock.hideBelowStock === 1
                    ? "border-amber-500 bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/50"
                    : "border-nexa-border hover:bg-nexa-hover text-nexa-text"
                }`}
              >
                <span className="font-medium block">Stok 0 gizle</span>
                <span className="text-[11px] opacity-80 mt-0.5 block">Sadece stoksuz ürünler çıktıdan çıkarılır</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={labelClass}>
                Özel eşik (isteğe bağlı)
                <input
                  type="number"
                  min="0"
                  placeholder="Kapalı (boş bırakın)"
                  value={stock.hideBelowStock ?? ""}
                  onFocus={() => {
                    stockInputBaselineRef.current = stock.hideBelowStock;
                  }}
                  onChange={(e) => {
                    const next = e.target.value === "" ? null : Number(e.target.value);
                    setStock({ ...stock, hideBelowStock: next });
                  }}
                  onBlur={(e) => {
                    const next = e.target.value === "" ? null : Number(e.target.value);
                    if (next !== stockInputBaselineRef.current) {
                      notifyStockFilterChange(next, "input");
                    }
                  }}
                  className={inputClass}
                />
                <span className="text-[10px] text-nexa-text-secondary mt-1 block">
                  Örnek: 9 yazarsanız stok 8 ve altı gizlenir · boş = filtre kapalı
                </span>
              </label>
              <label className={labelClass}>
                Düşük stok uyarısı (panel)
                <input
                  type="number"
                  min="0"
                  placeholder="Kapalı"
                  value={stock.lowStockWarning ?? ""}
                  onChange={(e) =>
                    setStock({
                      ...stock,
                      lowStockWarning: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {/* Çıktı markası — bayi bazlı */}
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-violet-400" />
              <div>
                <h2 className="font-semibold text-nexa-text">Çıktı Markası (Private Label)</h2>
                <p className="text-xs text-nexa-text-secondary">
                  Her bayi kendi markasını girer. Kaynak XML&apos;deki tedarikçi markaları çıktıda sizin markanıza dönüşür.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={feedTransform.enabled}
                onChange={(e) => setFeedTransform({ ...feedTransform, enabled: e.target.checked })}
                className="rounded border-nexa-border"
              />
              <span className="text-sm text-nexa-text">Çıktı XML&apos;de marka dönüşümünü uygula</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={labelClass}>
                Yayınlanacak marka (sizin markanız)
                <input
                  value={feedTransform.targetBrand}
                  onChange={(e) => setFeedTransform({ ...feedTransform, targetBrand: e.target.value })}
                  className={inputClass}
                  placeholder="örn: Mağaza Adınız"
                  disabled={!feedTransform.enabled}
                />
              </label>
              <label className={labelClass}>
                Kaynak marka adları (virgülle)
                <input
                  value={feedTransform.sourceBrandAliases.join(", ")}
                  onChange={(e) =>
                    setFeedTransform({
                      ...feedTransform,
                      sourceBrandAliases: e.target.value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={inputClass}
                  placeholder="örn: BEZOS, BEZOS HOME, Bayi Markası"
                  disabled={!feedTransform.enabled}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveFeedTransform}
                disabled={savingBrand}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-500 disabled:opacity-50"
              >
                <Save size={14} /> {savingBrand ? "Kaydediliyor..." : "Marka Ayarını Kaydet"}
              </button>
            </div>
          </div>

          {/* Kalite */}
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <div>
                <h2 className="font-semibold text-nexa-text">Kalite Kapısı</h2>
                <p className="text-xs text-nexa-text-secondary">
                  Eksik bilgili ürünler çıktıdan çıkarılır; panelde düzenleyip tekrar yayınlayabilirsiniz.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(
                [
                  ["requireImage", "Fotoğraf zorunlu"],
                  ["requireDescription", "Açıklama zorunlu"],
                  ["requireBarcode", "Barkod zorunlu"],
                  ["requireCategory", "Kategori zorunlu"],
                  ["requireVatRate", "KDV zorunlu"],
                  ["requireVariants", "Varyant tam zorunlu"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-nexa-border px-3 py-2.5 cursor-pointer hover:bg-nexa-hover/50"
                >
                  <input
                    type="checkbox"
                    checked={gate[key]}
                    onChange={(e) => setGate({ ...gate, [key]: e.target.checked })}
                    className="rounded border-nexa-border"
                  />
                  <span className="text-sm text-nexa-text">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* AI İçerik */}
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              <div>
                <h2 className="font-semibold text-nexa-text">AI İçerik Motoru</h2>
                <p className="text-xs text-nexa-text-secondary">
                  Her sync&apos;te şablon kuralları otomatik uygulanır. AI üretimi isteğe bağlıdır — kilitli alanlara dokunulmaz.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ai.enabled}
                  onChange={(e) => setAi({ ...ai, enabled: e.target.checked })}
                  className="rounded border-nexa-border"
                />
                <span className="text-sm text-nexa-text">AI içerik aktif</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ai.autoOnNewProducts}
                  onChange={(e) => setAi({ ...ai, autoOnNewProducts: e.target.checked })}
                  disabled={!ai.enabled}
                  className="rounded border-nexa-border disabled:opacity-40"
                />
                <span className="text-sm text-nexa-text">Yeni ürünlerde otomatik AI (sync sonrası, max 15)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ai.stripBrandFromTitle}
                  onChange={(e) => setAi({ ...ai, stripBrandFromTitle: e.target.checked })}
                  className="rounded border-nexa-border"
                />
                <span className="text-sm text-nexa-text">Başlıktan marka temizle</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className={labelClass}>
                Başlık öneki
                <input value={ai.titlePrefix} onChange={(e) => setAi({ ...ai, titlePrefix: e.target.value })} className={inputClass} placeholder="Örn: En Ucuz" />
              </label>
              <label className={labelClass}>
                Başlık soneki
                <input value={ai.titleSuffix} onChange={(e) => setAi({ ...ai, titleSuffix: e.target.value })} className={inputClass} placeholder="Örn: Hızlı Kargo" />
              </label>
              <label className={labelClass}>
                Açıklama öneki
                <input value={ai.descriptionPrefix} onChange={(e) => setAi({ ...ai, descriptionPrefix: e.target.value })} className={inputClass} />
              </label>
              <label className={labelClass}>
                Açıklama soneki
                <input value={ai.descriptionSuffix} onChange={(e) => setAi({ ...ai, descriptionSuffix: e.target.value })} className={inputClass} />
              </label>
            </div>

            <label className={labelClass}>
              Yasaklı kelimeler (virgülle)
              <input
                value={ai.bannedWords.join(", ")}
                onChange={(e) =>
                  setAi({
                    ...ai,
                    bannedWords: e.target.value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
                  })
                }
                className={inputClass}
                placeholder="örnek marka, kopya, ..."
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end border-t border-nexa-border pt-4">
              <label className={`${labelClass} flex-1`}>
                Uygulama kapsamı (kaynak)
                <select value={aiSourceId} onChange={(e) => setAiSourceId(e.target.value)} className={inputClass}>
                  <option value="">Tüm kaynaklar</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleApplyTemplate}
                disabled={aiRunning}
                className="px-4 py-2 border border-nexa-border text-sm rounded-lg hover:bg-nexa-hover disabled:opacity-50 whitespace-nowrap"
              >
                Şablonu uygula
              </button>
              <button
                onClick={handleApplyAi}
                disabled={aiRunning || !ai.enabled}
                className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-500 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
              >
                <Sparkles size={14} /> AI ile yenile
              </button>
            </div>
            <p className="text-[10px] text-nexa-text-secondary">
              AI için Ayarlar → Yapay Zeka API bölümünde sağlayıcı tanımlı olmalı. Mevcut ürünlerde AI yalnızca &quot;AI ile yenile&quot; ile çalışır.
            </p>
          </div>

          {/* Önizleme */}
          {preview && (
            <div className="rounded-xl border border-nexa-primary/30 bg-nexa-primary/5 p-5 space-y-4">
              <h3 className="font-semibold text-nexa-text text-sm">Önizleme sonucu</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-nexa-card border border-nexa-border p-3">
                  <p className="text-xs text-nexa-text-secondary">Fiyat değişecek</p>
                  <p className="text-lg font-semibold text-nexa-text">{preview.price.wouldChange}</p>
                </div>
                <div className="rounded-lg bg-nexa-card border border-nexa-border p-3">
                  <p className="text-xs text-nexa-text-secondary">Stok nedeniyle gizli</p>
                  <p className="text-lg font-semibold text-amber-500">{preview.output.hiddenByStock}</p>
                </div>
                <div className="rounded-lg bg-nexa-card border border-nexa-border p-3">
                  <p className="text-xs text-nexa-text-secondary">Kalite nedeniyle gizli</p>
                  <p className="text-lg font-semibold text-emerald-500">{preview.output.hiddenByGate}</p>
                </div>
                <div className="rounded-lg bg-nexa-card border border-nexa-border p-3">
                  <p className="text-xs text-nexa-text-secondary">Çıktıda kalacak</p>
                  <p className="text-lg font-semibold text-nexa-success">{preview.output.included}</p>
                </div>
              </div>
              {preview.price.sample.length > 0 && (
                <div>
                  <p className="text-xs text-nexa-text-secondary mb-1">Fiyat örnekleri</p>
                  <ul className="text-xs font-mono space-y-0.5">
                    {preview.price.sample.map((s, i) => (
                      <li key={i}>{s.name.slice(0, 45)} — {s.before.toFixed(2)} → {s.after.toFixed(2)} TL</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.output.excludedSample.length > 0 && (
                <div>
                  <p className="text-xs text-nexa-text-secondary mb-1">Gizlenecek örnekler</p>
                  <ul className="text-xs space-y-0.5">
                    {preview.output.excludedSample.map((s, i) => (
                      <li key={i}>
                        <span className={s.reason === "stock" ? "text-amber-500" : "text-emerald-500"}>
                          [{s.reason === "stock" ? "stok" : "kalite"}]
                        </span>{" "}
                        {s.name} {s.stock != null ? `(stok: ${s.stock})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Kaynak override */}
          <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
            <div className="px-4 py-3 border-b border-nexa-border">
              <h2 className="font-semibold text-nexa-text text-sm">Kaynak bazlı kurallar</h2>
              <p className="text-xs text-nexa-text-secondary mt-0.5">
                Bir kaynak için özel profil açarsanız genel kurallar yerine o profil geçerli olur
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexa-border bg-nexa-bg/50">
                  <th className="px-4 py-2 text-left text-nexa-text-secondary">Kaynak</th>
                  <th className="px-4 py-2 text-left text-nexa-text-secondary">Durum</th>
                  <th className="px-4 py-2 text-right text-nexa-text-secondary">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-nexa-text-secondary">
                      Henüz kaynak eklenmemiş — Kaynaklar sayfasından XML ekleyin
                    </td>
                  </tr>
                ) : (
                  sources.map((s) => (
                    <tr key={s.id} className="hover:bg-nexa-hover/30">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            s.useCustomRules
                              ? "bg-violet-500/10 text-violet-400"
                              : "bg-nexa-bg text-nexa-text-secondary"
                          }`}
                        >
                          {s.useCustomRules ? "Özel kurallar" : "Genel kurallar"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {s.useCustomRules ? (
                          <button onClick={() => toggleSourceCustomRules(s, false)} className="text-xs text-nexa-primary hover:underline">
                            Genel&apos;e dön
                          </button>
                        ) : (
                          <button onClick={() => createSourceProfile(s)} className="text-xs text-nexa-primary hover:underline">
                            Özel kural oluştur
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-nexa-text-secondary">
            Sync diff raporu ve kaynaktan silinen ürün onayı Faz 5&apos;te eklenecek. AI sağlayıcı: /thyronix/ai veya Ayarlar.
          </p>
        </>
      )}
    </div>
  );
}
