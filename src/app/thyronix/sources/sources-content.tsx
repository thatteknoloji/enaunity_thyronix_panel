"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Link2, Plus, Trash2, Pencil, RefreshCw, ExternalLink,
  Play, Pause, Search, Globe, FileJson, FileText, Download, Table
} from "lucide-react";
import toast from "react-hot-toast";
import { getTemplatesByGroup } from "@/lib/thyronix/templates";
import XmlMappingUI from "./mappings/xml-mapping";
import ExcelMappingUI from "./mappings/excel-mapping";
import CsvMappingUI from "./mappings/csv-mapping";
import ApiMappingUI from "./mappings/api-mapping";
import FixedValuesUI from "./mappings/fixed-values";
import type { ExcelValidationSummary } from "@/lib/thyronix/excel-parser";
import {
  buildVariantMappingReadiness,
  getMissingRequiredMappings,
  inferVariantFieldsFromColumns,
  mappingErrorLabel,
} from "@/lib/thyronix/mapping-validation";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active: { bg: "bg-nexa-success/10", text: "text-nexa-success", dot: "bg-nexa-success", label: "Aktif" },
    paused: { bg: "bg-nexa-warning/10", text: "text-nexa-warning", dot: "bg-nexa-warning", label: "Duraklatıldı" },
    error: { bg: "bg-nexa-danger/10", text: "text-nexa-danger", dot: "bg-nexa-danger", label: "Hata" },
  };
  const s = map[status] || map.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: typeof FileText; color: string }> = {
    xml: { icon: FileText, color: "text-orange-400" },
    excel: { icon: Table, color: "text-emerald-400" },
    csv: { icon: FileText, color: "text-amber-400" },
    json: { icon: FileJson, color: "text-yellow-400" },
    api: { icon: Globe, color: "text-violet-400" },
  };
  const t = map[type] || map.xml;
  return <t.icon size={14} className={t.color} />;
}

interface Source {
  id: string;
  name: string;
  xmlUrl: string;
  feedUrls?: string[];
  type: string;
  interval: number;
  status: string;
  productCount: number;
  lastSync: string | null;
  errorLog: string | null;
  variantMapping?: string | null;
  mappingSummary?: {
    readiness: "ready" | "partial" | "needs_attention";
    tested: boolean;
    syncHealthy: boolean;
    mappedFieldCount: number;
    mappedVariantCount: number;
    requiredReady: boolean;
    identityReady: boolean;
    variantReady: boolean;
    variantMissing: string[];
    lastTestedAt: string | null;
    lastTestCount: number | null;
    lastDetectedFieldCount: number | null;
    lastVariantFieldCount: number | null;
    lastValidRows: number | null;
    lastInvalidRows: number | null;
    hasError: boolean;
  };
}

type MappingValidationSummary = {
  validRows: number;
  invalidRows: number;
  missingProductName: number;
  missingPrice: number;
  missingIdentity: number;
  invalidSamples?: Array<{ row: number; name: string; errors: string[] }>;
};

function MappingSummaryBadge({ summary }: { summary?: Source["mappingSummary"] }) {
  if (!summary) return null;
  const tone =
    summary.readiness === "ready"
      ? "bg-nexa-success/10 text-nexa-success"
      : summary.readiness === "partial"
        ? "bg-nexa-warning/10 text-nexa-warning"
        : "bg-nexa-danger/10 text-nexa-danger";
  const label =
    summary.readiness === "ready"
      ? "Mapping Hazır"
      : summary.readiness === "partial"
        ? "Kısmi Hazır"
        : "Kontrol Gerekli";
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>;
}

export default function ThyronixSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState({ name: "", xmlUrl: "", type: "xml", interval: 720, inputFormat: "custom_xml" });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string,string>>({});
  const [variantMapping, setVariantMapping] = useState<Record<string,string>>({});
  const [fixedValues, setFixedValues] = useState<Record<string,string>>({});
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [variantFields, setVariantFields] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [variantSamples, setVariantSamples] = useState<Record<string,string>>({});
  const [fieldSamples, setFieldSamples] = useState<Record<string,string>>({});
  const [excelValidation, setExcelValidation] = useState<ExcelValidationSummary | null>(null);
  const [csvValidation, setCsvValidation] = useState<MappingValidationSummary | null>(null);
  const [testing, setTesting] = useState(false);
  const [testCount, setTestCount] = useState(0);

  // Excel-specific
  const [excelSheet, setExcelSheet] = useState("");
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [excelHeaderRow, setExcelHeaderRow] = useState(1);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelPreview, setExcelPreview] = useState<Record<string,string>[]>([]);

  // CSV-specific
  const [csvDelimiter, setCsvDelimiter] = useState(",");
  const [csvEncoding, setCsvEncoding] = useState("utf-8");
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string,string>[]>([]);

  // API-specific
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiHeaders, setApiHeaders] = useState("");
  const [apiAuthType, setApiAuthType] = useState("none");
  const [apiAuthValue, setApiAuthValue] = useState("");
  const [apiBody, setApiBody] = useState("");
  const [apiProductPath, setApiProductPath] = useState("data");
  const [apiPageParam, setApiPageParam] = useState("page");
  const [apiJsonFields, setApiJsonFields] = useState<string[]>([]);
  const [apiResponse, setApiResponse] = useState("");
  const [apiCount, setApiCount] = useState(0);
  const [lastTestMeta, setLastTestMeta] = useState<Record<string, string>>({});

  const testSource = async () => {
    if (!form.xmlUrl) return toast.error("Önce XML URL girin");
    setTesting(true);
    const res = await fetch("/api/thyronix/sources/test", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({xmlUrl:form.xmlUrl, inputFormat:form.inputFormat, variantMapping}) });
    const d = await res.json();
    if (d.success) {
      setDetectedFields(d.data.detectedFields);
      setVariantFields(d.data.variantFields || []);
      setTestResult(d.data);
      setFieldMapping(d.data.currentMapping || {});
      setFieldSamples(d.data.sampleValues || {});
      setVariantSamples(d.data.variantSampleValues || {});
      setLastTestMeta({
        _lastTestType: "xml",
        _lastTestedAt: new Date().toISOString(),
        _lastTestCount: String(d.data.totalItems || 0),
        _lastDetectedFieldCount: String((d.data.detectedFields || []).length),
        _lastVariantFieldCount: String((d.data.variantFields || []).length),
        _lastValidRows: "",
        _lastInvalidRows: "",
      });
      toast.success(`${d.data.totalItems} ürün, ${d.data.detectedFields.length} alan, ${(d.data.variantFields||[]).length} varyant alanı`);
    } else toast.error(d.error || "Test başarısız");
    setTesting(false);
  };

  const testExcel = async () => {
    if (!form.xmlUrl) return toast.error("Excel dosya yolu veya URL girin");
    setTesting(true);
    setExcelValidation(null);
    setCsvValidation(null);
    try {
      const res = await fetch("/api/thyronix/sources/excel/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.xmlUrl,
          sheetName: excelSheet || undefined,
          headerRow: excelHeaderRow,
          fieldMapping,
          variantMapping,
          fixedValues,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setExcelSheets(d.data.sheets||[]);
        setExcelSheet(d.data.selectedSheet||"");
        setExcelColumns(d.data.columns||[]);
        setExcelPreview(d.data.previewRows||[]);
        const nextVariantFields = d.data.variantFields || inferVariantFieldsFromColumns(d.data.columns || []);
        setVariantFields(nextVariantFields);
        setVariantSamples(d.data.variantSampleValues || {});
        setTestCount(d.data.totalRows||0);
        setExcelValidation(d.data.validation || null);
        setLastTestMeta({
          _lastTestType: "excel",
          _lastTestedAt: new Date().toISOString(),
          _lastTestCount: String(d.data.totalRows || 0),
          _lastDetectedFieldCount: String((d.data.columns || []).length),
          _lastVariantFieldCount: String(nextVariantFields.length),
          _lastValidRows: String(d.data.validation?.validRows || 0),
          _lastInvalidRows: String(d.data.validation?.invalidRows || 0),
        });
        toast.success(`${d.data.totalRows||0} satır, ${(d.data.columns||[]).length} kolon bulundu`);
      } else { toast.error(d.error||"Excel test başarısız"); }
    } catch { toast.error("Bağlantı hatası"); }
    setTesting(false);
  };

  const testCsv = async () => {
    if (!form.xmlUrl) return toast.error("CSV dosya yolu veya URL girin");
    setTesting(true);
    setCsvValidation(null);
    try {
      const res = await fetch("/api/thyronix/sources/csv/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.xmlUrl, delimiter: csvDelimiter, encoding: csvEncoding, hasHeader: csvHasHeader }),
      });
      const d = await res.json();
      if (d.success) {
        setCsvColumns(d.data.columns||[]);
        setCsvPreview(d.data.previewRows||[]);
        setCsvDelimiter(d.data.detectedDelimiter||csvDelimiter);
        setTestCount(d.data.totalRows||0);
        setCsvValidation(d.data.validation || null);
        setLastTestMeta({
          _lastTestType: "csv",
          _lastTestedAt: new Date().toISOString(),
          _lastTestCount: String(d.data.totalRows || 0),
          _lastDetectedFieldCount: String((d.data.columns || []).length),
          _lastVariantFieldCount: "0",
          _lastValidRows: String(d.data.validation?.validRows || 0),
          _lastInvalidRows: String(d.data.validation?.invalidRows || 0),
        });
        toast.success(`${d.data.totalRows||0} satır, ${(d.data.columns||[]).length} kolon bulundu`);
      } else { toast.error(d.error||"CSV test başarısız"); }
    } catch { toast.error("Bağlantı hatası"); }
    setTesting(false);
  };
  const testApi = async () => { if(!apiEndpoint)return toast.error("API URL girin"); setTesting(true); try{const r=await fetch("/api/thyronix/sources/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({xmlUrl:apiEndpoint,inputFormat:"custom_xml"})});const d=await r.json();if(d.success){setApiJsonFields(d.data?.detectedFields||[]);setApiCount(d.data?.totalItems||0);setApiResponse(JSON.stringify(d.data?.sampleValues||{},null,2));if(d.data?.currentMapping)setFieldMapping(d.data.currentMapping);toast.success("API yanıtı alındı")}else toast.error(d.error||"Hata")}catch{toast.error("Bağlantı hatası")}setTesting(false);};

  const syncSource = async (sourceId: string) => {
    setSyncing(sourceId);
    const res = await fetch(`/api/thyronix/sources/${sourceId}/sync`, { method: "POST" });
    const d = await res.json();
    if (d.success) toast.success(`${d.data.total} ürün (${d.data.created} yeni, ${d.data.updated} güncellendi)`);
    else toast.error(d.error || "Sync hatası");
    setSyncing(null);
    fetchSources();
  };

  const fetchSources = () => {
    setLoading(true);
    fetch("/api/thyronix/sources")
      .then(r => r.json())
      .then(d => setSources(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSources(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", xmlUrl: "", type: "xml", interval: 720, inputFormat: "custom_xml" });
    setFieldMapping({});
    setVariantMapping({});
    setFixedValues({});
    setTestResult(null);
    setExcelSheet("");
    setExcelSheets([]);
    setExcelHeaderRow(1);
    setExcelColumns([]);
    setExcelPreview([]);
    setExcelValidation(null);
    setCsvValidation(null);
    setCsvDelimiter(",");
    setCsvEncoding("utf-8");
    setCsvHasHeader(true);
    setCsvColumns([]);
    setCsvPreview([]);
    setDetectedFields([]);
    setVariantFields([]);
    setVariantSamples({});
    setFieldSamples({});
    setTestCount(0);
    setLastTestMeta({});
    setShowModal(true);
  };

  const openEdit = (s: Source) => {
    setEditing(s);
    setForm({ name: s.name, xmlUrl: s.xmlUrl, type: s.type, interval: s.interval, inputFormat: (s as any).inputFormat || "custom_xml" });
    try { setFieldMapping(JSON.parse((s as any).fieldMapping || "{}")); } catch { setFieldMapping({}); }
    try { setVariantMapping(JSON.parse((s as any).variantMapping || "{}")); } catch { setVariantMapping({}); }
    try {
      const parsedFixed = JSON.parse((s as any).fixedValues || "{}");
      setFixedValues(parsedFixed);
      setExcelSheet(parsedFixed._sheetName || "");
      setExcelHeaderRow(Number(parsedFixed._headerRow || 1));
      setCsvDelimiter(parsedFixed._delimiter || ",");
      setCsvEncoding(parsedFixed._encoding || "utf-8");
      setCsvHasHeader(parsedFixed._hasHeader !== "false");
    } catch {
      setFixedValues({});
      setExcelSheet("");
      setExcelHeaderRow(1);
      setCsvDelimiter(",");
      setCsvEncoding("utf-8");
      setCsvHasHeader(true);
    }
    setTestResult(null);
    setExcelSheets([]);
    setExcelColumns([]);
    setExcelPreview([]);
    setExcelValidation(null);
    setCsvValidation(null);
    setCsvColumns([]);
    setCsvPreview([]);
    setDetectedFields([]);
    setVariantFields([]);
    setVariantSamples({});
    setFieldSamples({});
    setTestCount(0);
    setLastTestMeta({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (form.type === "xml") {
      if (!editing && detectedFields.length === 0) {
        toast.error("XML kaynağını kaydetmeden önce test et");
        return;
      }
      const missing = getMissingRequiredMappings(fieldMapping);
      if (missing.length > 0) {
        toast.error(`Eksik eşleştirme: ${missing.map(mappingErrorLabel).join(", ")}`);
        return;
      }
    }

    if (form.type === "excel") {
      if (excelColumns.length === 0) {
        toast.error("Excel kaynağını kaydetmeden önce dosyayı test et");
        return;
      }
      const missing = getMissingRequiredMappings(fieldMapping);
      if (missing.length > 0) {
        toast.error(`Eksik eşleştirme: ${missing.map(mappingErrorLabel).join(", ")}`);
        return;
      }
    }

    const variantReadiness = buildVariantMappingReadiness(variantFields, variantMapping);
    if ((form.type === "xml" || form.type === "excel") && variantReadiness.detected && !variantReadiness.ready) {
      toast.error(`Varyant eşleştirmesi eksik: ${variantReadiness.missing.map(mappingErrorLabel).join(", ")}`);
      return;
    }

    if (form.type === "csv") {
      if (csvColumns.length === 0) {
        toast.error("CSV kaynağını kaydetmeden önce dosyayı test et");
        return;
      }
      const missing = getMissingRequiredMappings(fieldMapping);
      if (missing.length > 0) {
        toast.error(`Eksik eşleştirme: ${missing.map(mappingErrorLabel).join(", ")}`);
        return;
      }
    }

    const url = editing ? `/api/thyronix/sources/${editing.id}` : "/api/thyronix/sources";
    const method = editing ? "PUT" : "POST";
    const missingMappings = getMissingRequiredMappings(fieldMapping);
    const persistedFixedValues = {
      ...fixedValues,
      ...lastTestMeta,
      _mappedFieldCount: String(Object.keys(fieldMapping).filter((key) => fieldMapping[key]).length),
      _mappedVariantCount: String(Object.keys(variantMapping).filter((key) => variantMapping[key] && variantMapping[key] !== "variantIgnore").length),
      _requiredMappingReady: String(!missingMappings.includes("name") && !missingMappings.includes("price")),
      _identityMappingReady: String(!missingMappings.includes("identity")),
      _variantMappingReady: String(variantReadiness.ready),
      _variantMissing: variantReadiness.missing.join("|"),
      _variantFields: variantFields.join("|"),
      ...(form.type === "excel" ? { _sheetName: excelSheet, _headerRow: String(excelHeaderRow) } : {}),
      ...(form.type === "csv"
        ? {
            _delimiter: csvDelimiter,
            _encoding: csvEncoding,
            _hasHeader: csvHasHeader ? "true" : "false",
          }
        : {}),
    };
    const body: any = {
      ...form,
      fieldMapping: JSON.stringify(fieldMapping),
      variantMapping: JSON.stringify(variantMapping),
      fixedValues: JSON.stringify(persistedFixedValues),
    };
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowModal(false);
    fetchSources();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kaynağı silmek istediğine emin misin?")) return;
    await fetch(`/api/thyronix/sources/${id}`, { method: "DELETE" });
    fetchSources();
  };

  const handleToggleStatus = async (s: Source) => {
    const newStatus = s.status === "active" ? "paused" : "active";
    await fetch(`/api/thyronix/sources/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, status: newStatus }),
    });
    fetchSources();
  };

  const filtered = sources.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.xmlUrl.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = {
    active: sources.filter(s => s.status === "active").length,
    paused: sources.filter(s => s.status === "paused").length,
    error: sources.filter(s => s.status === "error").length,
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-nexa-text tracking-tight">Sources</h1>
          <p className="mt-0.5 text-sm text-nexa-text-secondary">XML kaynak yönetimi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/thyronix/connectors/vht-supplier-feeds"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexa-border px-3 py-2 text-xs font-medium text-nexa-text hover:bg-nexa-hover"
          >
            <Link2 size={14} /> VHT Feedleri (24)
          </Link>
          <Link
            href="/thyronix/connectors/bezos-bayi"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexa-border px-3 py-2 text-xs font-medium text-nexa-text hover:bg-nexa-hover"
          >
            <Link2 size={14} /> Bezos BAYİ XML
          </Link>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-nexa-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-[0.98]"
          >
            <Plus size={16} />
            Yeni Kaynak
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {[
          { label: "Aktif", count: statusCounts.active, color: "text-nexa-success", bg: "bg-nexa-success/5", border: "border-nexa-success/20" },
          { label: "Duraklatıldı", count: statusCounts.paused, color: "text-nexa-warning", bg: "bg-nexa-warning/5", border: "border-nexa-warning/20" },
          { label: "Hata", count: statusCounts.error, color: "text-nexa-danger", bg: "bg-nexa-danger/5", border: "border-nexa-danger/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} px-4 py-3`}>
            <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.count}</p>
            <p className="text-xs text-nexa-text-secondary mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary" />
          <input
            type="text"
            placeholder="Kaynak ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-nexa-card border border-nexa-border rounded-lg text-sm text-nexa-text placeholder:text-nexa-text-secondary/50 focus:outline-none focus:border-nexa-primary/50 transition-colors"
          />
        </div>
        <button onClick={fetchSources} className="p-2 rounded-lg border border-nexa-border text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-hover transition-colors" title="Yenile">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-nexa-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexa-border bg-nexa-card/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider">Kaynak</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider hidden md:table-cell">Tip</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider hidden sm:table-cell">Aralık</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider">Ürün</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider">Durum</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-nexa-text-secondary uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-nexa-border/50 last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 px-4"><div className="h-4 bg-nexa-border/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Link2 size={40} className="mx-auto text-nexa-border mb-3" />
                  <p className="text-nexa-text-secondary text-sm">{search ? "Kaynak bulunamadı" : "Henüz kaynak eklenmemiş"}</p>
                  {!search && (
                    <button onClick={openNew} className="mt-3 text-xs text-nexa-primary hover:text-blue-400 font-medium transition-colors">
                      İlk kaynağı ekle
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="border-b border-nexa-border/40 last:border-0 hover:bg-nexa-hover/50 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-nexa-border/40 flex items-center justify-center">
                        <TypeIcon type={s.type} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-nexa-text">{s.name}</p>
                          <MappingSummaryBadge summary={s.mappingSummary} />
                        </div>
                        <p className="text-xs text-nexa-text-secondary truncate max-w-[280px]" title={(s.feedUrls || [s.xmlUrl]).join("\n")}>
                          {(s.feedUrls?.length || 0) > 1
                            ? `${s.feedUrls!.length} feed URL · ${s.xmlUrl}`
                            : s.xmlUrl}
                        </p>
                        {s.mappingSummary && (
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-nexa-text-secondary">
                            <span>{s.mappingSummary.mappedFieldCount} alan eşleşti</span>
                            {s.mappingSummary.mappedVariantCount > 0 && (
                              <span>{s.mappingSummary.mappedVariantCount} varyant alanı</span>
                            )}
                            <span>{s.mappingSummary.requiredReady ? "Zorunlu hazır" : "Zorunlu eksik"}</span>
                            <span>{s.mappingSummary.identityReady ? "Kimlik hazır" : "Kimlik eksik"}</span>
                            {s.mappingSummary.lastVariantFieldCount && s.mappingSummary.lastVariantFieldCount > 0 && (
                              <span className={s.mappingSummary.variantReady ? "text-nexa-success" : "text-nexa-warning"}>
                                {s.mappingSummary.variantReady ? "Varyant hazır" : "Varyant eksik"}
                              </span>
                            )}
                            {typeof s.mappingSummary.lastTestCount === "number" && s.mappingSummary.lastTestCount > 0 && (
                              <span>Son test: {s.mappingSummary.lastTestCount.toLocaleString("tr-TR")} kayıt</span>
                            )}
                            {typeof s.mappingSummary.lastInvalidRows === "number" && s.mappingSummary.lastInvalidRows > 0 && (
                              <span className="text-nexa-warning">{s.mappingSummary.lastInvalidRows} hatalı satır</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs font-medium text-nexa-text-secondary uppercase">{s.type}</span>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-xs text-nexa-text-secondary">{s.interval} dk</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-semibold text-nexa-text tabular-nums">{s.productCount.toLocaleString("tr-TR")}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => syncSource(s.id)}
                        disabled={syncing === s.id}
                        className="p-1.5 rounded-lg text-nexa-primary hover:text-white hover:bg-nexa-primary/20 transition-colors"
                        title="Senkronize et"
                      >
                        {syncing === s.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-hover transition-colors" title="Düzenle">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-nexa-danger/70 hover:text-nexa-danger hover:bg-nexa-danger/10 transition-colors" title="Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
       {showModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-nexa-card border border-nexa-border rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-nexa-text mb-5">
              {editing ? "Kaynağı Düzenle" : "Yeni Kaynak Ekle"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-nexa-text-secondary mb-1.5">Kaynak Adı</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="örn: Tedarikçi A"
                  className="w-full px-3 py-2 bg-nexa-bg border border-nexa-border rounded-lg text-sm text-nexa-text placeholder:text-nexa-text-secondary/40 focus:outline-none focus:border-nexa-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-nexa-text-secondary mb-1.5">
                  {form.type === "xml" ? "XML URL" : form.type === "excel" ? "Excel Dosya Yolu" : form.type === "csv" ? "CSV Dosya Yolu" : "Dosya Yolu / URL"}
                </label>
                <input
                  type="text"
                  value={form.xmlUrl}
                  onChange={e => setForm({ ...form, xmlUrl: e.target.value })}
                  placeholder={form.type === "api" ? "https://api.example.com/v1/products" : "https://..."}
                  className="w-full px-3 py-2 bg-nexa-bg border border-nexa-border rounded-lg text-sm text-nexa-text placeholder:text-nexa-text-secondary/40 focus:outline-none focus:border-nexa-primary/50 font-mono text-xs"
                />
              </div>

              {form.type === "xml" && (
                <div>
                  <label className="block text-xs font-medium text-nexa-text-secondary mb-1.5">XML Formatı</label>
                  <select
                    value={form.inputFormat}
                    onChange={e => setForm({ ...form, inputFormat: e.target.value })}
                    className="w-full px-3 py-2 bg-nexa-bg border border-nexa-border rounded-lg text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50"
                  >
                    {Object.entries(getTemplatesByGroup()).map(([group, templates]) => (
                      <optgroup key={group} label={group}>
                        {templates.filter(t => t.id !== "custom_csv").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-nexa-text-secondary mb-1.5">Tip</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value, inputFormat: e.target.value === "excel" ? "excel" : e.target.value === "csv" ? "custom_csv" : e.target.value === "api" ? "api" : "custom_xml" })}
                    className="w-full px-3 py-2 bg-nexa-bg border border-nexa-border rounded-lg text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50"
                  >
                    <option value="xml">XML</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="api">API (Beta)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexa-text-secondary mb-1.5">Aralık (dk)</label>
                  <select
                    value={form.interval}
                    onChange={e => setForm({ ...form, interval: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-nexa-bg border border-nexa-border rounded-lg text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50"
                  >
                    <option value={15}>15 dk</option>
                    <option value={30}>30 dk</option>
                    <option value={60}>1 saat</option>
                    <option value={360}>6 saat</option>
                    <option value={720}>12 saat</option>
                    <option value={1440}>24 saat</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-nexa-border pt-4 mt-2">
              {/* XML Mapping */}
              {form.type === "xml" && (
                <XmlMappingUI
                  xmlUrl={form.xmlUrl} setXmlUrl={v=>setForm({...form,xmlUrl:v})}
                  template={form.inputFormat} setTemplate={v=>setForm({...form,inputFormat:v})}
                  detectedFields={detectedFields} detectedCount={testCount}
                  sampleValues={fieldSamples}
                  fieldMapping={fieldMapping} setFieldMapping={setFieldMapping}
                  variantMapping={variantMapping} setVariantMapping={setVariantMapping}
                  variantFields={variantFields}
                  variantSamples={variantSamples}
                  onTest={testSource} testing={testing}
                  testResult={testResult ? `${testCount} ürün tespit edildi` : ""}
                  templates={Object.entries(getTemplatesByGroup()).flatMap(([g,ts])=>ts.filter(t=>t.id!=="custom_csv").map(t=>({id:t.id,name:t.name,group:g})))}
                />
              )}

              {/* Excel Mapping */}
              {form.type === "excel" && (
                <ExcelMappingUI
                  fileName={form.xmlUrl} setFileName={v=>setForm({...form,xmlUrl:v})}
                  sheetName={excelSheet} setSheetName={setExcelSheet} sheets={excelSheets}
                  headerRow={excelHeaderRow} setHeaderRow={setExcelHeaderRow}
                  columns={excelColumns} previewRows={excelPreview}
                  fieldMapping={fieldMapping} setFieldMapping={setFieldMapping}
                  variantMapping={variantMapping} setVariantMapping={setVariantMapping}
                  variantFields={variantFields}
                  variantSamples={variantSamples}
                  onUpload={testExcel} uploading={testing}
                  detectedCount={excelPreview.length}
                  validation={excelValidation}
                />
              )}

              {/* CSV Mapping */}
              {form.type === "csv" && form.inputFormat !== "excel" && (
                <CsvMappingUI
                  fileName={form.xmlUrl} setFileName={v=>setForm({...form,xmlUrl:v})}
                  delimiter={csvDelimiter} setDelimiter={setCsvDelimiter}
                  encoding={csvEncoding} setEncoding={setCsvEncoding}
                  hasHeader={csvHasHeader} setHasHeader={setCsvHasHeader}
                  columns={csvColumns} previewRows={csvPreview}
                  fieldMapping={fieldMapping} setFieldMapping={setFieldMapping}
                  onLoad={testCsv} loading={testing}
                  validation={csvValidation}
                />
              )}

              {/* API Mapping */}
              {form.type === "api" && (
                <>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-4">
                    <p className="text-xs text-amber-400 font-medium mb-1">Beta</p>
                    <p className="text-xs text-nexa-text-secondary">API kaynak desteği beta aşamasındadır. JSON path, auth ve sayfalama desteği bir sonraki sürümde aktif olacaktır. Şimdilik sadece XML dönen API'leri test edebilirsiniz.</p>
                  </div>
                  <ApiMappingUI
                  endpoint={apiEndpoint} setEndpoint={setApiEndpoint}
                  method={apiMethod} setMethod={setApiMethod}
                  headers={apiHeaders} setHeaders={setApiHeaders}
                  authType={apiAuthType} setAuthType={setApiAuthType}
                  authValue={apiAuthValue} setAuthValue={setApiAuthValue}
                  body={apiBody} setBody={setApiBody}
                  productPath={apiProductPath} setProductPath={setApiProductPath}
                  pageParam={apiPageParam} setPageParam={setApiPageParam}
                  jsonFields={apiJsonFields}
                  fieldMapping={fieldMapping} setFieldMapping={setFieldMapping}
                  onTest={testApi} testing={testing}
                  responsePreview={apiResponse}
                  detectedCount={apiCount}
                />
                </>
              )}
            </div>

            {/* Fixed Values (all types) */}
            <div className="border-t border-nexa-border/40 pt-3 mt-3">
              <FixedValuesUI
                fixedValues={fixedValues}
                setFixedValues={setFixedValues}
                mode={form.type === "csv" && form.inputFormat === "excel" ? "excel" : "default"}
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-nexa-text-secondary hover:text-nexa-text transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.xmlUrl}
                className="px-4 py-2 bg-nexa-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {editing ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
