"use client";

import { FileText, Settings } from "lucide-react";
import { TARGET_FIELDS } from "./field-options";

const DELIMITERS = [
  { v:",", l:"Virgül (,)" },
  { v:";", l:"Noktalı virgül (;)" },
  { v:"\t", l:"Sekme (Tab)" },
  { v:"|", l:"Boru (|)" },
];

const ENCODINGS = [
  { v:"utf-8", l:"UTF-8" },
  { v:"windows-1254", l:"Windows-1254 (Türkçe)" },
  { v:"iso-8859-9", l:"ISO-8859-9 (Türkçe)" },
];

interface Props {
  fileName: string; setFileName: (v:string)=>void;
  delimiter: string; setDelimiter: (v:string)=>void;
  encoding: string; setEncoding: (v:string)=>void;
  hasHeader: boolean; setHasHeader: (v:boolean)=>void;
  columns: string[]; previewRows: Record<string,string>[];
  fieldMapping: Record<string,string>; setFieldMapping: (m:Record<string,string>)=>void;
  onLoad: ()=>void; loading: boolean;
  validation?: {
    validRows: number;
    invalidRows: number;
    missingProductName: number;
    missingPrice: number;
    missingIdentity: number;
    invalidSamples?: Array<{ row: number; name: string; errors: string[] }>;
  } | null;
}

export default function CsvMappingUI({
  fileName, setFileName, delimiter, setDelimiter, encoding, setEncoding,
  hasHeader, setHasHeader, columns, previewRows,
  fieldMapping, setFieldMapping, onLoad, loading, validation,
}: Props) {
  const mappedTargets = new Set(Object.values(fieldMapping).filter(Boolean));
  const mappedCount = columns.filter((col) => fieldMapping[col]).length;
  const requiredComplete = mappedTargets.has("name") && mappedTargets.has("price");
  const identityComplete = ["barcode", "stockCode", "modelCode", "externalId"].some((field) => mappedTargets.has(field));

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-amber-400"/>
          <h3 className="text-sm font-semibold text-nexa-text">CSV Kaynak Ayarları</h3>
        </div>

        <div className="mb-3">
          <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">CSV Dosyası</label>
          <div className="flex items-center gap-2">
            <input value={fileName} onChange={e=>setFileName(e.target.value)}
              placeholder="Dosya yolu veya URL"
              className="flex-1 rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"/>
            <button onClick={onLoad} disabled={loading || !fileName}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {loading?"Yükleniyor...":"Yükle"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Ayraç</label>
            <select value={delimiter} onChange={e=>setDelimiter(e.target.value)}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-2 py-2 text-sm text-nexa-text">
              {DELIMITERS.map(d=><option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Kodlama</label>
            <select value={encoding} onChange={e=>setEncoding(e.target.value)}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-2 py-2 text-sm text-nexa-text">
              {ENCODINGS.map(e=><option key={e.v} value={e.v}>{e.l}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasHeader} onChange={e=>setHasHeader(e.target.checked)}
                className="rounded border-nexa-border"/>
              <span className="text-sm text-nexa-text">Başlık satırı var</span>
            </label>
          </div>
        </div>
      </div>

      {columns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Kolon", value: columns.length, tone: "text-nexa-text" },
            { label: "Eşleşen", value: mappedCount, tone: "text-amber-400" },
            { label: "Zorunlu Alan", value: requiredComplete ? "Hazır" : "Eksik", tone: requiredComplete ? "text-emerald-400" : "text-amber-400" },
            { label: "Kimlik Alanı", value: identityComplete ? "Hazır" : "Eksik", tone: identityComplete ? "text-emerald-400" : "text-amber-400" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2">
              <p className="text-[10px] text-nexa-text-secondary">{item.label}</p>
              <p className={`text-sm font-semibold ${item.tone}`}>{String(item.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <h3 className="text-sm font-semibold text-nexa-text mb-3">Önizleme ({previewRows.length} satır)</h3>
          <div className="overflow-x-auto rounded-lg border border-nexa-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-nexa-bg">
                  {columns.map((c,i)=><th key={i} className="px-3 py-2 text-left text-nexa-text-secondary font-medium border-b border-nexa-border whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0,20).map((row,i)=>(
                  <tr key={i} className="hover:bg-nexa-hover">
                    {columns.map((c,j)=><td key={j} className="px-3 py-1.5 text-nexa-text border-b border-nexa-border/50 max-w-[200px] truncate">{row[c]||"—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validation && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-nexa-text">Doğrulama Özeti</h3>
            <span className="text-[11px] text-nexa-text-secondary">
              {validation.validRows} geçerli · {validation.invalidRows} hatalı
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              ["Ürün adı", validation.missingProductName],
              ["Fiyat", validation.missingPrice],
              ["Kimlik", validation.missingIdentity],
              ["Geçerli", validation.validRows],
              ["Hatalı", validation.invalidRows],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2">
                <p className="text-[10px] text-nexa-text-secondary">{label}</p>
                <p className="text-sm font-semibold text-nexa-text tabular-nums">{String(value)}</p>
              </div>
            ))}
          </div>
          {validation.invalidSamples && validation.invalidSamples.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-nexa-text-secondary mb-2">Örnek hatalar</p>
              <div className="space-y-2">
                {validation.invalidSamples.slice(0, 3).map((sample) => (
                  <div key={sample.row} className="rounded-lg border border-nexa-border/70 bg-nexa-bg/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-nexa-text">Satır {sample.row}</span>
                      <span className="text-[11px] text-nexa-text-secondary truncate">{sample.name}</span>
                    </div>
                    <p className="text-[11px] text-nexa-danger mt-1">{sample.errors.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Mapping */}
      {columns.length > 0 && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <h3 className="text-sm font-semibold text-nexa-text mb-3">Kolon Eşleştirme</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {columns.map(col => (
              <div key={col} className="flex items-center gap-3">
                <div className="w-1/2">
                  <div className="rounded bg-nexa-bg px-2 py-1.5">
                    <span className="text-xs font-medium text-nexa-text truncate block">{col}</span>
                    {previewRows[0]?.[col] && (
                      <span className="mt-1 block text-[10px] text-nexa-text-secondary/70 truncate">
                        Örnek: {String(previewRows[0][col])}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-nexa-text-secondary text-xs">→</span>
                <div className="w-1/2">
                  <select value={fieldMapping[col]||""}
                    onChange={e=>setFieldMapping({...fieldMapping,[col]:e.target.value})}
                    className={`w-full rounded-lg border text-xs px-2 py-1.5 focus:outline-none
                      ${fieldMapping[col] ? "border-amber-500/50 bg-amber-500/5 text-nexa-text" : "border-nexa-border bg-nexa-bg text-nexa-text-secondary"}`}>
                    <option value="">-- seçin --</option>
                    {TARGET_FIELDS.map(f=><option key={f.v} value={f.v}>{f.l}{f.req?" *":""}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
