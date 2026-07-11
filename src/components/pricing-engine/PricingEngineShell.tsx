"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calculator,
  CircleDollarSign,
  Database,
  FileText,
  Layers,
  LayoutDashboard,
  Loader2,
  Package,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";

type Tab =
  | "overview"
  | "materials"
  | "rules"
  | "variants"
  | "options"
  | "calculator"
  | "logs";

type Dashboard = {
  materialCount: number;
  activeMaterialCount: number;
  ruleCount: number;
  activeRuleCount: number;
  draftRuleCount: number;
  variantCount: number;
  optionCount: number;
  logCount: number;
  recentLogs: Array<{ id: string; ruleCode: string | null; finalPrice: number; createdAt: string }>;
};

type Material = { id: string; name: string; code: string; unit: string; baseCost: number; currency: string; isActive: boolean };
type Rule = {
  id: string;
  name: string;
  code: string;
  productType: string;
  formulaType: string;
  status: string;
  minPrice: number;
  version: number;
  material?: { name: string; code: string } | null;
};
type Variant = { id: string; name: string; code: string; adjustmentType: string; adjustmentValue: number; isActive: boolean; rule?: { code: string } };
type Option = { id: string; name: string; code: string; adjustmentType: string; adjustmentValue: number; isActive: boolean; rule?: { code: string } };
type LogRow = { id: string; inputJson: string; resultJson: string; createdAt: string; rule?: { code: string; name: string } };
type CalcResult = Record<string, unknown>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, init);
  return res.json();
}

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
  { id: "materials", label: "Malzemeler", icon: Package },
  { id: "rules", label: "Fiyat Kuralları", icon: Settings2 },
  { id: "variants", label: "Varyantlar", icon: Layers },
  { id: "options", label: "Opsiyonlar", icon: Sparkles },
  { id: "calculator", label: "Hesaplayıcı", icon: Calculator },
  { id: "logs", label: "Hesaplama Logları", icon: FileText },
];

export function PricingEngineShell() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const [calcForm, setCalcForm] = useState({
    ruleCode: "GLASS_PRINT_M2_V1",
    widthCm: 300,
    heightCm: 180,
    lengthMeter: 2,
    quantity: 1,
    customerType: "DEALER",
    variantCodes: "",
    optionCodes: "",
  });

  const [materialForm, setMaterialForm] = useState({ name: "", code: "", unit: "M2", baseCost: 0 });
  const [ruleForm, setRuleForm] = useState({
    name: "",
    code: "",
    productType: "CUSTOM",
    formulaType: "FIXED",
    basePrice: 0,
    minPrice: 0,
  });

  const loadDashboard = useCallback(async () => {
    const d = await fetchJson<Dashboard>("/api/admin/pricing-engine/stats");
    if (d.success && d.data) setDashboard(d.data);
  }, []);

  const loadMaterials = useCallback(async () => {
    const d = await fetchJson<Material[]>("/api/admin/pricing-engine/materials");
    if (d.success && d.data) setMaterials(d.data);
  }, []);

  const loadRules = useCallback(async () => {
    const d = await fetchJson<Rule[]>("/api/admin/pricing-engine/rules");
    if (d.success && d.data) setRules(d.data);
  }, []);

  const loadVariants = useCallback(async () => {
    const d = await fetchJson<Variant[]>("/api/admin/pricing-engine/variants");
    if (d.success && d.data) setVariants(d.data);
  }, []);

  const loadOptions = useCallback(async () => {
    const d = await fetchJson<Option[]>("/api/admin/pricing-engine/options");
    if (d.success && d.data) setOptions(d.data);
  }, []);

  const loadLogs = useCallback(async () => {
    const d = await fetchJson<LogRow[]>("/api/admin/pricing-engine/logs?limit=50");
    if (d.success && d.data) setLogs(d.data);
  }, []);

  useEffect(() => {
    if (tab === "overview") loadDashboard();
    if (tab === "materials") loadMaterials();
    if (tab === "rules") loadRules();
    if (tab === "variants") loadVariants();
    if (tab === "options") loadOptions();
    if (tab === "calculator") loadRules();
    if (tab === "logs") loadLogs();
  }, [tab, loadDashboard, loadMaterials, loadRules, loadVariants, loadOptions, loadLogs]);

  const runSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson("/api/admin/pricing-engine/seed", { method: "POST" });
      if (!d.success) throw new Error(d.error);
      await loadDashboard();
      await loadMaterials();
      await loadRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed hatası");
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson("/api/admin/pricing-engine/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialForm),
      });
      if (!d.success) throw new Error(d.error);
      setMaterialForm({ name: "", code: "", unit: "M2", baseCost: 0 });
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson("/api/admin/pricing-engine/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      if (!d.success) throw new Error(d.error);
      setRuleForm({ name: "", code: "", productType: "CUSTOM", formulaType: "FIXED", basePrice: 0, minPrice: 0 });
      await loadRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const publishRule = async (id: string) => {
    setLoading(true);
    try {
      await fetchJson(`/api/admin/pricing-engine/rules/${id}/publish`, { method: "POST" });
      await loadRules();
    } finally {
      setLoading(false);
    }
  };

  const archiveRule = async (id: string) => {
    setLoading(true);
    try {
      await fetchJson(`/api/admin/pricing-engine/rules/${id}/archive`, { method: "POST" });
      await loadRules();
    } finally {
      setLoading(false);
    }
  };

  const runCalculate = async () => {
    setLoading(true);
    setError(null);
    setCalcResult(null);
    try {
      const d = await fetchJson<CalcResult>("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleCode: calcForm.ruleCode,
          widthCm: Number(calcForm.widthCm),
          heightCm: Number(calcForm.heightCm),
          lengthMeter: Number(calcForm.lengthMeter),
          quantity: Number(calcForm.quantity),
          customerType: calcForm.customerType,
          variantCodes: calcForm.variantCodes.split(",").map((s) => s.trim()).filter(Boolean),
          optionCodes: calcForm.optionCodes.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!d.success) throw new Error(d.error);
      setCalcResult(d.data || null);
      if (tab === "logs") await loadLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hesaplama hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-400">
            <CircleDollarSign className="h-5 w-5" />
            <span className="text-sm font-medium">ENA_PRICING_ENGINE_V1</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">Fiyat Hesaplama Merkezi</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            POD, marketplace ve özel ölçü fiyatlarını ileride tek merkezden besleyecek çekirdek fiyat motoru.
          </p>
        </div>
        <button
          type="button"
          onClick={runSeed}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Varsayılan Kuralları Yükle
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                tab === t.id ? "bg-orange-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && dashboard && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Malzeme", dashboard.materialCount, dashboard.activeMaterialCount + " aktif"],
            ["Kural", dashboard.ruleCount, dashboard.activeRuleCount + " aktif"],
            ["Taslak Kural", dashboard.draftRuleCount, ""],
            ["Log", dashboard.logCount, dashboard.variantCount + " varyant"],
          ].map(([label, value, sub]) => (
            <div key={String(label)} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-sm text-zinc-400">{label}</div>
              <div className="mt-1 text-2xl font-bold text-white">{value}</div>
              {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
            </div>
          ))}
          <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 text-sm font-medium text-white">Son Hesaplamalar</div>
            <div className="space-y-2">
              {dashboard.recentLogs.length === 0 && <div className="text-sm text-zinc-500">Henüz log yok</div>}
              {dashboard.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm text-zinc-300">
                  <span>{log.ruleCode || "—"}</span>
                  <span>{log.finalPrice.toLocaleString("tr-TR")} TRY</span>
                  <span className="text-zinc-500">{new Date(log.createdAt).toLocaleString("tr-TR")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "materials" && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4">
            <input className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Ad" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
            <input className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Kod" value={materialForm.code} onChange={(e) => setMaterialForm({ ...materialForm, code: e.target.value })} />
            <select className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}>
              {["M2", "CM2", "PIECE", "METER", "KG", "LITER"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={createMaterial} className="rounded bg-orange-600 px-3 py-2 text-sm text-white">Malzeme Ekle</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">Ad</th><th className="px-3 py-2 text-left">Birim</th><th className="px-3 py-2 text-left">Maliyet</th></tr></thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-800 text-zinc-200">
                    <td className="px-3 py-2">{m.code}</td>
                    <td className="px-3 py-2">{m.name}</td>
                    <td className="px-3 py-2">{m.unit}</td>
                    <td className="px-3 py-2">{m.baseCost} {m.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-3">
            <input className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Ad" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
            <input className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Kod" value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} />
            <select className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" value={ruleForm.formulaType} onChange={(e) => setRuleForm({ ...ruleForm, formulaType: e.target.value })}>
              {["AREA_BASED", "PIECE_BASED", "METER_BASED", "FIXED", "CUSTOM_FORMULA"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <button type="button" onClick={createRule} className="rounded bg-orange-600 px-3 py-2 text-sm text-white md:col-span-3">Kural Ekle (Taslak)</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">Ad</th><th className="px-3 py-2 text-left">Formül</th><th className="px-3 py-2 text-left">Durum</th><th className="px-3 py-2 text-left">İşlem</th></tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-800 text-zinc-200">
                    <td className="px-3 py-2">{r.code}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.formulaType}</td>
                    <td className="px-3 py-2">{r.status} v{r.version}</td>
                    <td className="px-3 py-2 space-x-2">
                      {r.status !== "ACTIVE" && <button type="button" onClick={() => publishRule(r.id)} className="text-orange-400">Yayınla</button>}
                      {r.status !== "ARCHIVED" && <button type="button" onClick={() => archiveRule(r.id)} className="text-zinc-400">Arşivle</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "variants" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2 text-left">Kural</th><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">Tip</th><th className="px-3 py-2 text-left">Değer</th></tr></thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-3 py-2">{v.rule?.code}</td>
                  <td className="px-3 py-2">{v.code}</td>
                  <td className="px-3 py-2">{v.adjustmentType}</td>
                  <td className="px-3 py-2">{v.adjustmentValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "options" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2 text-left">Kural</th><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">Tip</th><th className="px-3 py-2 text-left">Değer</th></tr></thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-3 py-2">{o.rule?.code}</td>
                  <td className="px-3 py-2">{o.code}</td>
                  <td className="px-3 py-2">{o.adjustmentType}</td>
                  <td className="px-3 py-2">{o.adjustmentValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "calculator" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <select className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white" value={calcForm.ruleCode} onChange={(e) => setCalcForm({ ...calcForm, ruleCode: e.target.value })}>
              {rules.filter((r) => r.status === "ACTIVE").map((r) => <option key={r.id} value={r.code}>{r.code} — {r.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Genişlik (cm)" value={calcForm.widthCm} onChange={(e) => setCalcForm({ ...calcForm, widthCm: Number(e.target.value) })} />
              <input type="number" className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Yükseklik (cm)" value={calcForm.heightCm} onChange={(e) => setCalcForm({ ...calcForm, heightCm: Number(e.target.value) })} />
              <input type="number" className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Uzunluk (m)" value={calcForm.lengthMeter} onChange={(e) => setCalcForm({ ...calcForm, lengthMeter: Number(e.target.value) })} />
              <input type="number" className="rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Adet" value={calcForm.quantity} onChange={(e) => setCalcForm({ ...calcForm, quantity: Number(e.target.value) })} />
            </div>
            <select className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white" value={calcForm.customerType} onChange={(e) => setCalcForm({ ...calcForm, customerType: e.target.value })}>
              <option value="RETAIL">Perakende</option>
              <option value="DEALER">Bayi</option>
            </select>
            <input className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Varyant kodları (virgülle)" value={calcForm.variantCodes} onChange={(e) => setCalcForm({ ...calcForm, variantCodes: e.target.value })} />
            <input className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="Opsiyon kodları (virgülle)" value={calcForm.optionCodes} onChange={(e) => setCalcForm({ ...calcForm, optionCodes: e.target.value })} />
            <button type="button" onClick={runCalculate} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Hesapla
            </button>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 text-sm font-medium text-white">Sonuç</div>
            {!calcResult && <div className="text-sm text-zinc-500">Henüz hesaplama yok</div>}
            {calcResult && (
              <div className="space-y-2 text-sm text-zinc-200">
                <div>Alan: <strong>{String(calcResult.areaM2)}</strong> m²</div>
                <div>Son fiyat: <strong>{Number(calcResult.finalPrice).toLocaleString("tr-TR")} {String(calcResult.currency)}</strong></div>
                <div>Perakende: {Number(calcResult.retailPrice).toLocaleString("tr-TR")}</div>
                <div>Bayi: {Number(calcResult.dealerPrice).toLocaleString("tr-TR")}</div>
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <div className="mb-2 font-medium text-white">Breakdown</div>
                  {Array.isArray(calcResult.breakdown) && (calcResult.breakdown as Array<{ label: string; amount: number }>).map((line, i) => (
                    <div key={i} className="flex justify-between py-1 text-zinc-400">
                      <span>{line.label}</span>
                      <span>{Number(line.amount).toLocaleString("tr-TR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400"><tr><th className="px-3 py-2 text-left">Kural</th><th className="px-3 py-2 text-left">Tarih</th><th className="px-3 py-2 text-left">Girdi</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-3 py-2">{log.rule?.code || "—"}</td>
                  <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString("tr-TR")}</td>
                  <td className="px-3 py-2 max-w-md truncate">{log.inputJson}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
