"use client";

import { FileText, ChevronDown, Search, CheckCircle2 } from "lucide-react";
import { TARGET_FIELDS, VARIANT_TARGET_FIELDS } from "./field-options";

interface Props {
  xmlUrl: string; setXmlUrl: (v:string)=>void;
  template: string; setTemplate: (v:string)=>void;
  detectedFields: string[]; detectedCount: number;
  sampleValues?: Record<string, string>;
  fieldMapping: Record<string,string>; setFieldMapping: (m:Record<string,string>)=>void;
  variantMapping: Record<string,string>; setVariantMapping: (m:Record<string,string>)=>void;
  variantFields: string[];
  variantSamples?: Record<string, string>;
  onTest: ()=>void; testing: boolean; testResult: string;
  templates?: {id:string;name:string;group:string}[];
}

export default function XmlMappingUI({
  xmlUrl, setXmlUrl, template, setTemplate,
  detectedFields, detectedCount, sampleValues = {}, fieldMapping, setFieldMapping,
  variantMapping, setVariantMapping,
  variantFields, variantSamples = {}, onTest, testing, testResult,
  templates = [],
}: Props) {
  const grouped = templates.reduce((acc:Record<string,any[]>,t)=>{
    (acc[t.group||"Diğer"]=acc[t.group||"Diğer"]||[]).push(t); return acc;
  },{});

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-nexa-primary"/>
          <h3 className="text-sm font-semibold text-nexa-text">XML Kaynak Ayarları</h3>
        </div>

        {/* URL */}
        <div className="mb-3">
          <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">XML Feed URL</label>
          <input value={xmlUrl} onChange={e=>setXmlUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50"/>
        </div>

        {/* Template + Test */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">XML Şablonu</label>
            <select value={template} onChange={e=>setTemplate(e.target.value)}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none">
              <option value="custom_xml">Özel XML</option>
              {Object.entries(grouped).map(([g,items])=>(
                <optgroup key={g} label={g}>
                  {items.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <button onClick={onTest} disabled={testing || !xmlUrl}
            className="px-4 py-2 rounded-lg bg-nexa-primary text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {testing ? "Test ediliyor..." : "XML'i Test Et"}
          </button>
        </div>

        {testResult && (
          <div className="mt-3 text-xs text-nexa-text-secondary bg-nexa-bg/50 rounded-lg p-3">
            {testResult}
          </div>
        )}

        {detectedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <CheckCircle2 size={14} className="text-nexa-success"/>
            <span className="text-nexa-text">{detectedCount} ürün tespit edildi</span>
            <span className="text-nexa-text-secondary">• {detectedFields.length} alan • {variantFields.length} varyant alanı</span>
          </div>
        )}
      </div>

      {/* Field Mapping */}
      {detectedFields.length > 0 && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-nexa-primary"/>
            <h3 className="text-sm font-semibold text-nexa-text">Alan Eşleştirme</h3>
            <span className="text-[11px] text-nexa-text-secondary ml-auto">{detectedFields.filter(f=>fieldMapping[f]).length}/{detectedFields.length} eşleşti</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {detectedFields.map(xmlField => (
              <div key={xmlField} className="flex items-center gap-3">
                <div className="w-1/2">
                  <div className="rounded bg-nexa-bg px-2 py-1.5">
                    <span className="text-xs font-mono text-nexa-text-secondary truncate block">{xmlField}</span>
                    {sampleValues[xmlField] && (
                      <span className="mt-1 block text-[10px] text-nexa-text-secondary/70 truncate">
                        Örnek: {sampleValues[xmlField]}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-nexa-text-secondary text-xs">→</span>
                <div className="w-1/2">
                  <select value={fieldMapping[xmlField]||""}
                    onChange={e=>setFieldMapping({...fieldMapping,[xmlField]:e.target.value})}
                    className={`w-full rounded-lg border text-xs px-2 py-1.5 focus:outline-none
                      ${fieldMapping[xmlField] ? "border-nexa-success/50 bg-nexa-success/5 text-nexa-text" : "border-nexa-border bg-nexa-bg text-nexa-text-secondary"}`}>
                    <option value="">-- seçin --</option>
                    {TARGET_FIELDS.map(f=>(
                      <option key={f.v} value={f.v}>{f.l}{f.req?" *":""}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variant fields */}
      {(variantFields.length > 0 || Object.keys(variantMapping).length > 0) && (
        <div className="p-3 rounded-xl bg-nexa-card border border-nexa-border">
          <p className="text-xs text-nexa-text-secondary mb-2">
            <span className="text-nexa-warning font-semibold">Ⓥ Varyant alanları:</span> {Array.from(new Set([...variantFields, ...Object.keys(variantMapping)])).join(", ") || "—"}
          </p>
          <p className="text-[10px] text-nexa-text-secondary">Eşleştirmediğin alanlar otomatik özellik olarak işlenmeye devam eder.</p>
        </div>
      )}

      {/* Variant Mapping */}
      {(variantFields.length > 0 || Object.keys(variantMapping).length > 0) && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-nexa-primary"/>
            <h3 className="text-sm font-semibold text-nexa-text">Varyant Alan Eşleştirme</h3>
            <span className="text-[11px] text-nexa-text-secondary ml-auto">
              {Array.from(new Set([...variantFields, ...Object.keys(variantMapping)])).filter(f=>variantMapping[f]).length}
              /
              {Array.from(new Set([...variantFields, ...Object.keys(variantMapping)])).length}
              eşleşti
            </span>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin">
            {Array.from(new Set([...variantFields, ...Object.keys(variantMapping)])).map(variantField => (
              <div key={variantField} className="flex items-center gap-3">
                <div className="w-1/2">
                  <div className="rounded bg-nexa-bg px-2 py-1.5">
                    <span className="text-xs font-mono text-nexa-text-secondary truncate block">{variantField}</span>
                    {variantSamples[variantField] && (
                      <span className="mt-1 block text-[10px] text-nexa-text-secondary/70 truncate">
                        Örnek: {variantSamples[variantField]}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-nexa-text-secondary text-xs">→</span>
                <div className="w-1/2">
                  <select
                    value={variantMapping[variantField] || ""}
                    onChange={e=>setVariantMapping({ ...variantMapping, [variantField]: e.target.value })}
                    className={`w-full rounded-lg border text-xs px-2 py-1.5 focus:outline-none
                      ${variantMapping[variantField] ? "border-nexa-primary/50 bg-nexa-primary/5 text-nexa-text" : "border-nexa-border bg-nexa-bg text-nexa-text-secondary"}`}
                  >
                    <option value="">-- otomatik bırak --</option>
                    {VARIANT_TARGET_FIELDS.map(f=>(
                      <option key={f.v} value={f.v}>{f.l}{f.req ? " *" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-nexa-text-secondary">
            Barkod, SKU, fiyat, stok ve görsel alanlarını buradan sabitleyebilirsin. Özellik / renk / beden gibi kalan alanlar otomatik seçenek olarak işlenir.
          </p>
        </div>
      )}
    </div>
  );
}
