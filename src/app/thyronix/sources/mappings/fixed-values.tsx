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

interface Props {
  fixedValues: Record<string,string>;
  setFixedValues: (v:Record<string,string>)=>void;
}

export default function FixedValuesUI({ fixedValues, setFixedValues }: Props) {
  return (
    <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
      <div className="flex items-center gap-2 mb-3">
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
    </div>
  );
}
