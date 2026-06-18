"use client";

import { Globe, Key, Play, Braces } from "lucide-react";

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

const AUTH_TYPES = [
  { v:"none", l:"Yok" },
  { v:"bearer", l:"Bearer Token" },
  { v:"apikey", l:"API Key (Header)" },
  { v:"basic", l:"Basic Auth" },
];

interface Props {
  endpoint: string; setEndpoint: (v:string)=>void;
  method: string; setMethod: (v:string)=>void;
  headers: string; setHeaders: (v:string)=>void;
  authType: string; setAuthType: (v:string)=>void;
  authValue: string; setAuthValue: (v:string)=>void;
  body: string; setBody: (v:string)=>void;
  productPath: string; setProductPath: (v:string)=>void;
  pageParam: string; setPageParam: (v:string)=>void;
  jsonFields: string[];
  fieldMapping: Record<string,string>; setFieldMapping: (m:Record<string,string>)=>void;
  onTest: ()=>void; testing: boolean;
  responsePreview: string;
  detectedCount: number;
}

export default function ApiMappingUI({
  endpoint, setEndpoint, method, setMethod, headers, setHeaders,
  authType, setAuthType, authValue, setAuthValue, body, setBody,
  productPath, setProductPath, pageParam, setPageParam,
  jsonFields, fieldMapping, setFieldMapping,
  onTest, testing, responsePreview, detectedCount,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-violet-400"/>
          <h3 className="text-sm font-semibold text-nexa-text">API Bağlantı Ayarları</h3>
        </div>

        {/* Endpoint + Method */}
        <div className="flex items-end gap-2 mb-3">
          <div className="w-20">
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Metod</label>
            <select value={method} onChange={e=>setMethod(e.target.value)}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-2 py-2 text-sm text-nexa-text">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Endpoint URL</label>
            <input value={endpoint} onChange={e=>setEndpoint(e.target.value)}
              placeholder="https://api.example.com/v1/products"
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"/>
          </div>
        </div>

        {/* Auth */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Kimlik Doğrulama</label>
            <select value={authType} onChange={e=>setAuthType(e.target.value)}
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-2 py-2 text-sm text-nexa-text">
              {AUTH_TYPES.map(a=><option key={a.v} value={a.v}>{a.l}</option>)}
            </select>
          </div>
          {authType !== "none" && (
            <div>
              <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">
                {authType==="bearer"?"Token":authType==="apikey"?"API Key":authType==="basic"?"user:pass":"Değer"}
              </label>
              <input value={authValue} onChange={e=>setAuthValue(e.target.value)} type="password"
                className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text"/>
            </div>
          )}
        </div>

        {/* Headers + Body */}
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Özel Header'lar (JSON)</label>
            <input value={headers} onChange={e=>setHeaders(e.target.value)}
              placeholder='{"X-Custom":"value"}'
              className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-xs font-mono text-nexa-text"/>
          </div>
          {method === "POST" && (
            <div>
              <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Request Body (JSON)</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
                placeholder='{"query":"..."}'
                className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-xs font-mono text-nexa-text"/>
            </div>
          )}
        </div>

        {/* Test button */}
        <button onClick={onTest} disabled={testing || !endpoint}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
          <Play size={13}/> {testing?"Test ediliyor...":"Bağlantıyı Test Et"}
        </button>
      </div>

      {/* Response Preview */}
      {responsePreview && (
        <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
          <div className="flex items-center gap-2 mb-2">
            <Braces size={16} className="text-violet-400"/>
            <h3 className="text-sm font-semibold text-nexa-text">API Yanıtı</h3>
            {detectedCount > 0 && <span className="text-xs text-nexa-success ml-auto">{detectedCount} ürün bulundu</span>}
          </div>
          <pre className="text-[11px] font-mono text-nexa-text-secondary bg-nexa-bg rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{responsePreview.substring(0,2000)}</pre>
        </div>
      )}

      {/* Product path + Field mapping */}
      {responsePreview && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
            <h3 className="text-sm font-semibold text-nexa-text mb-3">Ürün Dizisi Yolu</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">JSON Path</label>
                <input value={productPath} onChange={e=>setProductPath(e.target.value)}
                  placeholder="data.products veya results"
                  className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm font-mono text-nexa-text"/>
              </div>
              <div>
                <label className="text-[11px] text-nexa-text-secondary font-medium mb-1 block">Sayfa Parametresi</label>
                <input value={pageParam} onChange={e=>setPageParam(e.target.value)}
                  placeholder="page"
                  className="w-24 rounded-lg border border-nexa-border bg-nexa-bg px-2 py-2 text-sm text-nexa-text"/>
              </div>
            </div>
          </div>

          {jsonFields.length > 0 && (
            <div className="p-4 rounded-xl bg-nexa-card border border-nexa-border">
              <h3 className="text-sm font-semibold text-nexa-text mb-3">JSON Alan Eşleştirme</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                {jsonFields.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-1/2">
                      <span className="text-xs font-mono text-nexa-text-secondary bg-nexa-bg px-2 py-1 rounded truncate block">{f}</span>
                    </div>
                    <span className="text-nexa-text-secondary text-xs">→</span>
                    <div className="w-1/2">
                      <select value={fieldMapping[f]||""}
                        onChange={e=>setFieldMapping({...fieldMapping,[f]:e.target.value})}
                        className={`w-full rounded-lg border text-xs px-2 py-1.5 focus:outline-none
                          ${fieldMapping[f] ? "border-violet-500/50 bg-violet-500/5 text-nexa-text" : "border-nexa-border bg-nexa-bg text-nexa-text-secondary"}`}>
                        <option value="">-- seçin --</option>
                        {TARGET_FIELDS.map(tf=><option key={tf.v} value={tf.v}>{tf.l}{tf.req?" *":""}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
