"use client";

import { useState, useRef } from "react";
import { Download, Upload, FileSpreadsheet, FileDown, ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function ThyronixImportExportPage() {
  const [importMode, setImportMode] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const EXPORTS = [
    { type: "products", label: "Tüm Ürünler", desc: "İsim, barkod, stok, fiyat, kategori", format: "csv" },
    { type: "errors", label: "Hatalı Ürünler", desc: "Fiyat/stok/barkod sorunu olan ürünler", format: "csv" },
    { type: "stock", label: "Stok Raporu", desc: "Stoğa göre sıralı ürün listesi", format: "csv" },
    { type: "price", label: "Fiyat Raporu", desc: "Fiyata göre sıralı ürün listesi", format: "csv" },
  ];

  const IMPORTS = [
    { key: "price", label: "Fiyat Güncelleme", desc: "CSV: barcode,price" },
    { key: "stock", label: "Stok Güncelleme", desc: "CSV: barcode,stock" },
    { key: "brand", label: "Marka Eşleştirme", desc: "CSV: sourceBrand,targetBrand" },
    { key: "category", label: "Kategori Eşleştirme", desc: "CSV: sourceCategory,targetCategory" },
  ];

  const handleExport = (type: string) => {
    window.open(`/api/thyronix/export?type=${type}&format=csv`, "_blank");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
      const data = lines.slice(1).map(l=>{
        const vals = l.split(",").map(v=>v.trim().replace(/"/g,""));
        const row: Record<string,string> = {};
        headers.forEach((h,i)=>{row[h]=vals[i]||"";});
        return row;
      });
      setPreview(data.slice(0, 10));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !importMode) return toast.error("Dosya ve import modu seçin");
    setImporting(true);
    
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
    
    // Parse all rows first
    const rows: Record<string,string>[] = [];
    for (let i=1; i<Math.min(lines.length, 5000); i++) {
      const vals = lines[i].split(",").map(v=>v.trim().replace(/"/g,""));
      const row: Record<string,string> = {};
      headers.forEach((h,j)=>{row[h]=vals[j]||"";});
      rows.push(row);
    }

    let updated = 0;
    const BATCH = 100;

    if (importMode === "price" || importMode === "stock") {
      // Batch: collect all barcode+value pairs, send in chunks
      const pairs = rows.filter(r=>r.barcode).map(r=>({barcode:r.barcode,value:r[importMode]}));
      for (let i=0; i<pairs.length; i+=BATCH) {
        const batch = pairs.slice(i,i+BATCH);
        const res = await fetch("/api/thyronix/products/bulk", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({action:importMode,ids:batch.map(p=>p.barcode),value:batch.map(p=>p.value).join(","),mode:"replace"})
        });
        if (res.ok) updated+=batch.length;
      }
    } else if (importMode === "brand") {
      // Batch brand mappings
      const unique = [...new Map(rows.filter(r=>r.sourceBrand).map(r=>[r.sourceBrand,r.targetBrand])).entries()];
      for (let i=0; i<unique.length; i+=BATCH) {
        await Promise.all(unique.slice(i,i+BATCH).map(([s,t])=>
          fetch("/api/thyronix/brand-mapping", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceBrand:s,targetBrand:t})})
        ));
        updated+=Math.min(BATCH,unique.length-i);
      }
    } else if (importMode === "category") {
      const unique = [...new Map(rows.filter(r=>r.sourceCategory).map(r=>[r.sourceCategory,r.targetCategory])).entries()];
      for (let i=0; i<unique.length; i+=BATCH) {
        await Promise.all(unique.slice(i,i+BATCH).map(([s,t])=>
          fetch("/api/thyronix/category-mapping", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceCategory:s,targetCategory:t})})
        ));
        updated+=Math.min(BATCH,unique.length-i);
      }
    }

    toast.success(`${updated} satır işlendi`);
    setImporting(false); setFile(null); setPreview([]); setImportMode("");
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-nexa-text">Import / Export</h1><p className="text-sm text-nexa-text-secondary mt-1">Excel/CSV ile ürün, fiyat, stok, marka içe/dışa aktarımı</p></div>

      {/* Export */}
      <div>
        <h2 className="font-semibold text-nexa-text mb-3 flex items-center gap-2"><FileDown size={16} className="text-nexa-success"/> Dışa Aktar (Export)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {EXPORTS.map(e=>(
            <button key={e.type} onClick={()=>handleExport(e.type)} className="rounded-xl border border-nexa-border bg-nexa-card p-4 text-left hover:border-nexa-primary/30 transition-colors group">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-nexa-text text-sm">{e.label}</p><p className="text-xs text-nexa-text-secondary mt-0.5">{e.desc}</p></div>
                <Download size={18} className="text-nexa-text-secondary group-hover:text-nexa-primary transition-colors"/>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Import */}
      <div>
        <h2 className="font-semibold text-nexa-text mb-3 flex items-center gap-2"><Upload size={16} className="text-nexa-primary"/> İçe Aktar (Import)</h2>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {IMPORTS.map(im=>(
              <button key={im.key} onClick={()=>setImportMode(im.key)} className={`rounded-lg border p-3 text-left transition-colors ${importMode===im.key?"border-nexa-primary bg-nexa-primary/5":"border-nexa-border bg-nexa-bg/30 hover:bg-nexa-hover"}`}>
                <p className="font-medium text-nexa-text text-sm">{im.label}</p>
                <p className="text-[10px] text-nexa-text-secondary mt-0.5">{im.desc}</p>
                {importMode===im.key && <Check size={14} className="text-nexa-primary mt-1"/>}
              </button>
            ))}
          </div>
          
          {importMode && (
            <>
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-nexa-border bg-nexa-bg/30 cursor-pointer hover:border-nexa-primary/50 transition-colors">
                <FileSpreadsheet size={18} className="text-nexa-text-secondary"/>
                <span className="text-sm text-nexa-text-secondary">{file ? file.name : "CSV dosyası seçin (.csv)"}</span>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden"/>
              </label>

              {preview.length > 0 && (
                <div className="rounded-lg border border-nexa-border overflow-hidden">
                  <table className="w-full text-xs"><thead><tr className="bg-nexa-bg/50"><th className="px-3 py-2 text-left text-nexa-text-secondary">#</th>{Object.keys(preview[0]).map(k=><th key={k} className="px-3 py-2 text-left text-nexa-text-secondary">{k}</th>)}</tr></thead>
                    <tbody className="divide-y divide-nexa-border">{preview.map((r,i)=><tr key={i} className="hover:bg-nexa-hover"><td className="px-3 py-2 text-nexa-text-secondary">{i+1}</td>{Object.values(r).map((v,j)=><td key={j} className="px-3 py-2 text-nexa-text">{String(v)}</td>)}</tr>)}</tbody></table>
                  <p className="px-3 py-2 text-[10px] text-nexa-text-secondary bg-nexa-bg/30">... ve {Math.max(0, (file?.size||0) - 10)} satır daha</p>
                </div>
              )}

              {file && (
                <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
                  <ArrowRight size={14}/> {importing?"İşleniyor...":"İçe Aktar"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
