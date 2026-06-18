"use client";

import { Layers, Save } from "lucide-react";

export default function ThyronixStockPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Stock Engine</h1><p className="text-sm text-nexa-text-secondary mt-1">Stok yönetimi: safety stock, stok modları, stok kuralları</p></div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
        <h2 className="font-semibold text-nexa-text">Stok Modu</h2>
        <p className="text-xs text-nexa-text-secondary">XML kaynaklarından gelen stok değerleri nasıl işlenecek?</p>
        <div className="space-y-2">
          {[
            { label: "Gerçek Stok", desc: "XML'deki stok değeri aynen kullanılır", active: true },
            { label: "Safety Stok", desc: "Yayınlanan stok = Gerçek stok - Safety değer (örn: -5)", active: false },
            { label: "Çoklu Kaynak Toplam", desc: "Aynı ürün birden fazla XML'de varsa stokları toplanır", active: false },
            { label: "Kaynak Öncelikli", desc: "En yüksek stoklu veya öncelikli kaynağın stoğu kullanılır", active: false },
          ].map((m,i)=>(
            <div key={i} className={`rounded-lg border p-3 flex items-center justify-between ${m.active?"border-nexa-success/30 bg-nexa-success/5":"border-nexa-border bg-nexa-bg/30"}`}>
              <div><p className="text-sm font-medium text-nexa-text">{m.label}</p><p className="text-[10px] text-nexa-text-secondary">{m.desc}</p></div>
              {m.active && <span className="text-[10px] text-nexa-success bg-nexa-success/10 px-2 py-0.5 rounded">Aktif</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6">
        <h2 className="font-semibold text-nexa-text mb-4">Stok Kuralları</h2>
        <p className="text-xs text-nexa-text-secondary mb-0">Stok değerine göre otomatik aksiyonlar (Rule Engine üzerinden yönetilir)</p>
        <div className="text-center py-8 text-nexa-text-secondary text-sm">
          Stok kuralları Rules sayfasından IF/THEN olarak tanımlanır.<br/>Örn: IF stock &lt; 5 THEN setStatus("pasif")
        </div>
      </div>
    </div>
  );
}
