"use client";

import { Settings } from "lucide-react";

const FIXED_FIELDS = [
  { v:"brand", l:"Varsayılan Marka" },
  { v:"category", l:"Varsayılan Kategori" },
  { v:"currency", l:"Para Birimi" },
  { v:"vatRate", l:"KDV Oranı (%)" },
  { v:"status", l:"Ürün Durumu" },
  { v:"safetyStock", l:"Güvenlik Stoku" },
];

const EXCEL_RULE_FIELDS = [
  { v:"brandOverride", l:"Excel Marka Değiştir" },
  { v:"namePrefix", l:"Ürün Adı Prefix" },
  { v:"nameSuffix", l:"Ürün Adı Suffix" },
  { v:"nameReplaceFrom", l:"Ad İçeriği Bul" },
  { v:"nameReplaceTo", l:"Ad İçeriği Değiştir" },
  { v:"descriptionPrefix", l:"Açıklama Prefix" },
  { v:"descriptionSuffix", l:"Açıklama Suffix" },
  { v:"descriptionReplaceFrom", l:"Açıklama Bul" },
  { v:"descriptionReplaceTo", l:"Açıklama Değiştir" },
  { v:"barcodePrefix", l:"Barkod Prefix" },
  { v:"stockCodePrefix", l:"Stok Kodu Prefix" },
  { v:"modelCodePrefix", l:"Model Kodu Prefix" },
  { v:"externalIdPrefix", l:"External ID Prefix" },
  { v:"priceMultiplier", l:"Fiyat Çarpan" },
  { v:"priceAdd", l:"Fiyat Ekle" },
  { v:"priceMin", l:"Minimum Fiyat" },
  { v:"priceRoundTo", l:"Fiyat Yuvarla" },
  { v:"vatRateOverride", l:"KDV Override (%)" },
  { v:"stockFloor", l:"Minimum Stok" },
];

interface Props {
  fixedValues: Record<string,string>;
  setFixedValues: (v:Record<string,string>)=>void;
  mode?: "default" | "excel";
}

export default function FixedValuesUI({ fixedValues, setFixedValues, mode = "default" }: Props) {
  const isExcel = mode === "excel";
  return (
    <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border space-y-4">
      <div className="flex items-center gap-2">
        <Settings size={16} className="text-nexa-text-secondary"/>
        <h3 className="text-sm font-semibold text-nexa-text">Sabit Değerler</h3>
        <span className="text-[10px] text-nexa-text-secondary">(tüm ürünlere uygulanır)</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FIXED_FIELDS.map(f=>(
          <div key={f.v}>
            <label className="text-[10px] text-nexa-text-secondary font-medium mb-0.5 block">{f.l}</label>
            <input value={fixedValues[f.v]||""} onChange={e=>setFixedValues({...fixedValues,[f.v]:e.target.value})}
              placeholder={f.v==="currency"?"TRY":f.v==="vatRate"?"18":f.v==="status"?"active":"—"}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-1.5 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/30"/>
          </div>
        ))}
      </div>
      {isExcel && (
        <div className="rounded-xl border border-nexa-border/70 bg-nexa-bg/40 p-3 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-nexa-text">Excel Kuralları</h4>
            <p className="text-[10px] text-nexa-text-secondary">Yüklemeden önce isim, kod ve fiyat alanlarını tek yerden dönüştür.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EXCEL_RULE_FIELDS.map(f=>(
              <div key={f.v}>
                <label className="text-[10px] text-nexa-text-secondary font-medium mb-0.5 block">{f.l}</label>
                <input
                  value={fixedValues[f.v]||""}
                  onChange={e=>setFixedValues({...fixedValues,[f.v]:e.target.value})}
                  placeholder={
                    f.v.includes("price") ? "1.1 / 5 / 100" :
                    f.v.includes("Prefix") ? "EK-" :
                    f.v.includes("ReplaceTo") ? "Yeni Metin" :
                    f.v.includes("ReplaceFrom") ? "Eski Metin" :
                    f.v === "stockFloor" ? "0" : "—"
                  }
                  className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-1.5 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/30"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
