"use client";

import { Table, Upload, ChevronDown } from "lucide-react";
import { TARGET_FIELDS } from "./field-options";
import type { ExcelValidationSummary } from "@/lib/thyronix/excel-parser";

interface Props {
  fileName: string; setFileName: (v:string)=>void;
  sheetName: string; setSheetName: (v:string)=>void;
  sheets: string[];
  headerRow: number; setHeaderRow: (v:number)=>void;
  columns: string[]; previewRows: Record<string,string>[];
  fieldMapping: Record<string,string>; setFieldMapping: (m:Record<string,string>)=>void;
  onUpload: ()=>void; uploading: boolean;
  detectedCount: number;
  validation?: ExcelValidationSummary | null;
}

export default function ExcelMappingUI({
  fileName, setFileName, sheetName, setSheetName, sheets,
  headerRow, setHeaderRow, columns, previewRows,
  fieldMapping, setFieldMapping, onUpload, uploading, detectedCount, validation,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
        <div className="flex items-center gap-2 mb-3">
          <Table size={16} className="text-emerald-400"/>
          <h3 className="text-sm font-semibold text-nexa-text">Excel Kaynak Ayarları</h3>
        </div>

        <div className="mb-3">
          <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Excel Dosyası</label>
          <div className="flex items-center gap-2">
            <input value={fileName} onChange={e=>setFileName(e.target.value)}
              placeholder="Dosya yolu veya URL"
              className="flex-1 rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"/>
            <button onClick={onUpload} disabled={uploading || !fileName}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              <Upload size={13}/> {uploading?"Yükleniyor...":"Yükle"}
            </button>
          </div>
        </div>

        {sheets.length > 0 && (
          <div className="flex items-end gap-3">
            <div>
              <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Sayfa</label>
              <select value={sheetName} onChange={e=>setSheetName(e.target.value)}
                className="rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text">
                {sheets.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Başlık Satırı</label>
              <input type="number" min={1} value={headerRow} onChange={e=>setHeaderRow(Number(e.target.value))}
                className="w-20 rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text"/>
            </div>
          </div>
        )}
      </div>

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
          {validation.invalidSamples.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-nexa-text-secondary mb-2">Örnek hatalar</p>
              <div className="space-y-2">
                {validation.invalidSamples.slice(0, 3).map(sample => (
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
                  <span className="text-xs font-medium text-nexa-text bg-nexa-bg px-2 py-1 rounded truncate block">{col}</span>
                </div>
                <span className="text-nexa-text-secondary text-xs">→</span>
                <div className="w-1/2">
                  <select value={fieldMapping[col]||""}
                    onChange={e=>setFieldMapping({...fieldMapping,[col]:e.target.value})}
                    className={`w-full rounded-lg border text-xs px-2 py-1.5 focus:outline-none
                      ${fieldMapping[col] ? "border-emerald-500/50 bg-emerald-500/5 text-nexa-text" : "border-nexa-border bg-nexa-bg text-nexa-text-secondary"}`}>
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
