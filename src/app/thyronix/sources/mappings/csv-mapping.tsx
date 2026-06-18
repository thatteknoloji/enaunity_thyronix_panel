"use client";

import { FileText, Settings } from "lucide-react";

const TARGET_FIELDS = [
  { v:"name", l:"Ürün Adı", req:true },
  { v:"description", l:"Açıklama" },
  { v:"brand", l:"Marka" },
  { v:"category", l:"Kategori" },
  { v:"barcode", l:"Barkod" },
  { v:"stockCode", l:"Stok Kodu" },
  { v:"modelCode", l:"Model Kodu" },
  { v:"price", l:"Fiyat", req:true },
  { v:"salePrice", l:"İndirimli Fiyat" },
  { v:"stock", l:"Stok" },
  { v:"currency", l:"Para Birimi" },
  { v:"images", l:"Görseller" },
  { v:"status", l:"Durum" },
];

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
}

export default function CsvMappingUI({
  fileName, setFileName, delimiter, setDelimiter, encoding, setEncoding,
  hasHeader, setHasHeader, columns, previewRows,
  fieldMapping, setFieldMapping, onLoad, loading,
}: Props) {
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
