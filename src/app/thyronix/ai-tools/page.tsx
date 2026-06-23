"use client";

import { useEffect, useState } from "react";
import { Brain, FileText, Tag, Sparkles, ListFilter, BarChart3, GitBranch, Map, Lightbulb, Zap, MessageSquare, Activity } from "lucide-react";
import toast from "react-hot-toast";

const TABS = [
  { id: "title", icon: FileText, label: "Title Optimizer", desc: "SEO & GEO optimized title" },
  { id: "desc", icon: Sparkles, label: "Description", desc: "AI-generated descriptions" },
  { id: "category", icon: Tag, label: "Category", desc: "Smart category suggestions" },
  { id: "private", icon: Map, label: "Private Label", desc: "Brand-aligned content" },
  { id: "attrs", icon: ListFilter, label: "Attributes", desc: "Extract structured data" },
  { id: "quality", icon: BarChart3, label: "Quality Score", desc: "Product quality analysis" },
  { id: "bulk", icon: Zap, label: "Bulk Actions", desc: "Batch AI operations" },
  { id: "feed", icon: Activity, label: "Feed Optimizer", desc: "Pre-publish analysis" },
  { id: "rule", icon: GitBranch, label: "Rule Assistant", desc: "Natural language rules" },
  { id: "mapping", icon: Map, label: "Mapping", desc: "Auto field detection" },
  { id: "consultant", icon: Lightbulb, label: "Consultant", desc: "AI-powered insights" },
];

const PROVIDERS = [
  { v: "openai", l: "OpenAI" }, { v: "claude", l: "Claude" }, { v: "gemini", l: "Gemini" },
  { v: "deepseek", l: "DeepSeek" }, { v: "grok", l: "Grok (xAI)" }, { v: "openrouter", l: "OpenRouter" },
  { v: "custom", l: "Custom" }, { v: "ollama", l: "Ollama" },
];

export default function ThyronixAiToolsPage() {
  const [activeTab, setActiveTab] = useState("title");
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState("");

  // Quality score calculation (local, no AI needed for scoring)
  const [qualityResult, setQualityResult] = useState<any>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const myRes = await fetch("/api/thyronix/ai/my-provider");
      const myData = await myRes.json();
      if (myData.success && myData.data?.configured && myData.data?.id) {
        const p = { id: myData.data.id, name: myData.data.name, model: myData.data.model, provider: myData.data.provider };
        setProviders([p]);
        setSelectedProvider(p.id);
        return;
      }
      const res = await fetch("/api/admin/nexa-ai-providers");
      const d = await res.json();
      if (d.success && d.data.length > 0) {
        setProviders(d.data);
        setSelectedProvider(d.data[0].id);
      }
    };
    loadProviders();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    const res = await fetch(`/api/thyronix/products?page=1&size=20&search=${encodeURIComponent(searchTerm)}`);
    const d = await res.json();
    if (d.success) setSearchResults(d.data?.items || []);
  };

  const callAi = async (task: string, prompt: string, productId?: string, extra?: any) => {
    if (!selectedProvider) return toast.error("Önce Ayarlar → Yapay Zeka API bölümünden API anahtarınızı girin");
    setLoading(true); setResult(null); setPreviewHtml("");
    try {
      const res = await fetch("/api/thyronix/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: selectedProvider, task, productId: productId || selectedProduct?.id || "", prompt, ...extra }),
      });
      const d = await res.json();
      setResult(d);
      if (d.success && d.content) {
        setPreviewHtml(d.content);
        toast.success("AI yanıtı alındı");
      } else { toast.error(d.error || "Hata"); }
    } catch { toast.error("Bağlantı hatası"); }
    setLoading(false);
  };

  const handleQualityScore = async () => {
    if (!selectedProduct) return toast.error("Ürün seçin");
    setLoading(true);
    const p = selectedProduct;
    let score = 50;
    const details: string[] = [];
    if ((p.name || "").length > 20) { score += 10; details.push("İyi başlık"); } else { details.push("Başlık çok kısa"); }
    if ((p.description || "").length > 50) { score += 10; details.push("İyi açıklama"); } else { details.push("Açıklama eksik/çok kısa"); }
    if (p.category) { score += 8; details.push("Kategori mevcut"); } else { details.push("Kategori eksik"); score -= 5; }
    if (p.brand) { score += 7; details.push("Marka mevcut"); } else { details.push("Marka eksik"); score -= 3; }
    if (p.price && p.price > 0) { score += 5; } else { details.push("Fiyat eksik/sıfır"); score -= 5; }
    if (p.stock && p.stock > 0) { score += 3; } else { details.push("Stok yok"); }
    if (p.barcode) { score += 3; } else { details.push("Barkod eksik"); }
    if (p.images) { score += 2; } else { details.push("Görsel eksik"); }
    if (p.variantData) { score += 2; details.push("Varyant verisi mevcut"); }
    setQualityResult({ score: Math.min(100, Math.max(0, score)), details });
    setLoading(false);
  };

  const aiTasks = {
    title: () => callAi("title_optimize",
      `Optimize this product title for SEO, GEO, and marketplace readability.
      Product: ${selectedProduct?.name || ""}
      Brand: ${selectedProduct?.brand || ""}
      Category: ${selectedProduct?.category || ""}
      ${(selectedProduct?.variantData || selectedProduct?.description || "") ? "Attributes: " + (selectedProduct?.variantData || selectedProduct?.description || "").substring(0, 500) : ""}
      ${formData.keywords ? "Target keywords: " + formData.keywords : ""}
      Rules: Do not invent features. Preserve model codes. Return ONLY the optimized title.`),

    desc: () => callAi("description_generate",
      `Generate an SEO and GEO optimized product description.
      Title: ${selectedProduct?.name || ""}
      Brand: ${selectedProduct?.brand || ""}
      Category: ${selectedProduct?.category || ""}
      Existing: ${(selectedProduct?.description || "").substring(0, 300)}
      ${formData.keywords ? "Keywords: " + formData.keywords : ""}
      Output HTML format. Do not hallucinate. Return ONLY the description.`),

    category: () => callAi("category_suggest",
      `Suggest the best category for this product. Return JSON: {"category":"...","subcategory":"...","confidence":0.8,"reasoning":"..."}
      Product: ${selectedProduct?.name || ""}
      Brand: ${selectedProduct?.brand || ""}
      Existing: ${selectedProduct?.category || ""}
      Desc: ${(selectedProduct?.description || "").substring(0, 300)}`,
      undefined, { responseFormat: "json_object" }),

    private: () => callAi("private_label",
      `Rewrite this product content for the brand "${formData.brandName || selectedProduct?.brand || "My Brand"}".
      Original title: ${selectedProduct?.name || ""}
      Original desc: ${(selectedProduct?.description || "").substring(0, 300)}
      Original brand: ${selectedProduct?.brand || ""}
      Output: {"title":"...","description":"...","marketing":"..."} in JSON.`),

    attrs: () => callAi("attribute_extract",
      `Extract structured attributes from this product. Return JSON: {"color":"","size":"","material":"","gender":"","usageType":"","specs":[]}
      Title: ${selectedProduct?.name || ""}
      Desc: ${(selectedProduct?.description || "").substring(0, 500)}`),

    bulk: () => callAi("bulk_action",
      `Generate ${formData.bulkAction || "title"} for the following product: ${selectedProduct?.name || ""}.
      Brand: ${selectedProduct?.brand || ""}. Category: ${selectedProduct?.category || ""}.
      Return ONLY the result, no extra text.`),

    feed: () => callAi("feed_optimize",
      `Analyze this product for feed readiness. Return JSON: {"score":75,"issues":["...","..."],"suggestions":["...","..."]}
      Product: ${selectedProduct?.name || ""}
      Brand: ${selectedProduct?.brand || ""} Category: ${selectedProduct?.category || ""}
      Price: ${selectedProduct?.price} Stock: ${selectedProduct?.stock}`),

    rule: () => callAi("rule_assistant",
      `Convert this natural language request to a THYRONIX rule: "${formData.ruleText || "Do not publish products under 100 TL price"}".
      Return JSON: {"field":"price","operator":"lt","value":"100","action":"exclude"}`),

    mapping: () => callAi("mapping_assist",
      `For these XML fields, suggest THYRONIX field mappings. Return JSON array of objects: {"xml":"field_name","thyronix":"suggested_thyronix_field"}
      Fields: ${formData.xmlFields || "urun_adi, fiyat, stok, marka, kategori, barkod, aciklama"}
      Available THYRONIX fields: name, price, stock, brand, category, barcode, description, images, variantData`),

    consultant: () => callAi("feed_consultant",
      `You are a product data consultant. Analyze this THYRONIX feed summary and give actionable advice in Turkish.
      Stats: 50,202 total products, 2 sources, 1 feed. Issues: 15,763 zero-price, 10,050 zero-stock, 85 missing barcodes.
      Give 3-5 specific, actionable suggestions. Return plain text.`),
  };

  const handleTabAction = () => {
    const fn = aiTasks[activeTab as keyof typeof aiTasks];
    if (fn) fn();
  };

  const activeTabItem = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2"><Brain size={24} className="text-nexa-primary" /> THYRONIX AI Tools</h1><p className="text-sm text-nexa-text-secondary mt-1">AI-assisted product intelligence</p></div>
      </div>

      {/* Provider selector */}
      <div className="flex items-center gap-3 rounded-xl border border-nexa-border bg-nexa-card p-3">
        <span className="text-xs text-nexa-text-secondary whitespace-nowrap">AI Provider:</span>
        <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-1.5 text-sm text-nexa-text">
          <option value="">Seçin...</option>
          {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.provider})</option>)}
        </select>
        {selectedProvider && <span className="text-[10px] text-nexa-success">Hazır</span>}
        {!selectedProvider && <a href="/thyronix/ai" className="text-xs text-nexa-primary hover:underline">Provider ekle →</a>}

        {/* Product Search */}
        <span className="text-xs text-nexa-text-secondary ml-4">Ürün:</span>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Barkod veya isim..." className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-1.5 text-sm text-nexa-text w-40" />
        <button onClick={handleSearch} className="px-3 py-1.5 bg-nexa-bg/50 text-nexa-text text-xs rounded-lg hover:bg-nexa-hover">Ara</button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4 max-h-48 overflow-y-auto space-y-1">
          {searchResults.map((p: any) => (
            <div key={p.id} onClick={() => { setSelectedProduct(p); setSearchResults([]); setSearchTerm(p.name); }} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-nexa-hover cursor-pointer text-sm">
              <span className="text-nexa-text truncate flex-1">{p.name}</span>
              <span className="text-[10px] text-nexa-text-secondary">{p.brand} • {p.barcode}</span>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />}
            <div><p className="text-sm font-medium text-nexa-text">{selectedProduct.name}</p><p className="text-[10px] text-nexa-text-secondary">{selectedProduct.brand} • {selectedProduct.barcode} • {selectedProduct.price}₺</p></div>
          </div>
          <button onClick={() => { setSelectedProduct(null); setSearchTerm(""); }} className="text-xs text-nexa-text-secondary hover:text-nexa-danger">Temizle</button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setResult(null); setPreviewHtml(""); setQualityResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-nexa-primary text-white" : "bg-nexa-bg/50 text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-hover"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          {activeTabItem && <activeTabItem.icon size={18} className="text-nexa-primary" />}
          <div><h2 className="font-semibold text-nexa-text">{activeTabItem?.label}</h2><p className="text-xs text-nexa-text-secondary">{activeTabItem?.desc}</p></div>
        </div>

        {/* Title Optimizer extra: keywords */}
        {activeTab === "title" && (
          <input value={formData.keywords || ""} onChange={e => setFormData({ ...formData, keywords: e.target.value })} placeholder="Hedef anahtar kelimeler (opsiyonel)" className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
        )}
        {activeTab === "desc" && (
          <input value={formData.keywords || ""} onChange={e => setFormData({ ...formData, keywords: e.target.value })} placeholder="Hedef anahtar kelimeler (opsiyonel)" className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
        )}
        {activeTab === "private" && (
          <input value={formData.brandName || ""} onChange={e => setFormData({ ...formData, brandName: e.target.value })} placeholder="Hedef marka adı" className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
        )}
        {activeTab === "rule" && (
          <textarea value={formData.ruleText || ""} onChange={e => setFormData({ ...formData, ruleText: e.target.value })} placeholder="Doğal dilde kural yazın... (örn: 100 TL altı ürünleri yayınlama)" rows={2} className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
        )}
        {activeTab === "mapping" && (
          <textarea value={formData.xmlFields || ""} onChange={e => setFormData({ ...formData, xmlFields: e.target.value })} placeholder="XML alan adları (virgülle ayrılmış)" rows={2} className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text" />
        )}
        {activeTab === "bulk" && (
          <select value={formData.bulkAction || "title"} onChange={e => setFormData({ ...formData, bulkAction: e.target.value })} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text">
            <option value="title">Title Generate</option>
            <option value="description">Description Generate</option>
            <option value="category">Category Suggest</option>
            <option value="attributes">Attribute Extract</option>
          </select>
        )}

        {/* Info box */}
        {(activeTab === "mapping" || activeTab === "rule" || activeTab === "category" || activeTab === "attrs" || activeTab === "feed") && (
          <div className="rounded-lg bg-nexa-primary/5 border border-nexa-primary/20 p-3 text-xs text-nexa-text-secondary">
            <MessageSquare size={12} className="inline mr-1" />
            {activeTab === "mapping" && "AI XML alan adlarını analiz ederek THYRONIX alanlarına eşleyecek"}
            {activeTab === "rule" && "AI doğal dil kuralını IF/THEN yapısına dönüştürecek"}
            {activeTab === "category" && "AI ürün verilerine göre en uygun kategoriyi önerecek"}
            {activeTab === "attrs" && "AI başlık ve açıklamadan renk, beden, malzeme gibi özellikleri çıkaracak"}
            {activeTab === "feed" && "AI feed kalitesini analiz edip iyileştirme önerileri sunacak"}
          </div>
        )}

        <button onClick={handleTabAction} disabled={loading || !selectedProvider || (!selectedProduct && activeTab !== "consultant" && activeTab !== "mapping" && activeTab !== "rule")}
          className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <Zap size={14} /> {loading ? "Çalışıyor..." : activeTab === "quality" ? "Skor Hesapla" : "AI ile Çalıştır"}
        </button>

        {/* Quality Score display */}
        {activeTab === "quality" && qualityResult && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-nexa-primary">{qualityResult.score}</div>
              <div className="text-xs text-nexa-text-secondary">/ 100</div>
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${qualityResult.score >= 80 ? "bg-nexa-success/10 text-nexa-success" : qualityResult.score >= 50 ? "bg-nexa-warning/10 text-nexa-warning" : "bg-nexa-danger/10 text-nexa-danger"}`}>
                {qualityResult.score >= 80 ? "Mükemmel" : qualityResult.score >= 60 ? "İyi" : qualityResult.score >= 40 ? "Orta" : "Zayıf"}
              </div>
            </div>
            <div className="w-full h-2 bg-nexa-bg/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${qualityResult.score >= 80 ? "bg-nexa-success" : qualityResult.score >= 50 ? "bg-nexa-warning" : "bg-nexa-danger"}`} style={{ width: `${qualityResult.score}%` }} />
            </div>
            <ul className="space-y-1">
              {qualityResult.details.map((d: string, i: number) => (
                <li key={i} className={`text-xs flex items-center gap-1 ${d.startsWith("İyi") || d.endsWith("mevcut") ? "text-nexa-success" : "text-nexa-danger"}`}>
                  {d.startsWith("İyi") || d.endsWith("mevcut") ? "✓" : "✗"} {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Result display */}
        {result && activeTab !== "quality" && (
          <div className="space-y-3 mt-4">
            {activeTab === "category" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Tag size={14} className="text-nexa-primary" /><span className="text-nexa-text font-medium">{j.category}</span><span className="text-nexa-text-secondary text-xs">→ {j.subcategory}</span></div>
                <div className="text-xs text-nexa-text-secondary">Confidence: {(j.confidence * 100).toFixed(0)}%</div>
                <p className="text-xs text-nexa-text-secondary">{j.reasoning}</p>
              </div>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {activeTab === "rule" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <div className="space-y-1 p-3 rounded-lg bg-nexa-bg/50">
                <p className="text-xs text-nexa-text-secondary">IF <span className="font-mono text-nexa-primary">{j.field}</span> <span className="text-nexa-text-secondary">{j.operator}</span> <span className="font-mono text-nexa-primary">{j.value}</span></p>
                <p className="text-xs text-nexa-text-secondary">THEN <span className="font-mono text-nexa-primary">{j.action}</span></p>
                <button onClick={async () => {
                  await fetch("/api/admin/nexa-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "AI Kuralı", field: j.field, operator: j.operator, value: j.value, action: j.action, priority: 1 }) });
                  toast.success("Kural oluşturuldu");
                }} className="px-3 py-1 bg-nexa-primary text-white text-xs rounded mt-2">Kuralı Kaydet</button>
              </div>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {activeTab === "mapping" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <table className="w-full text-xs"><thead><tr className="border-b border-nexa-border"><th className="text-left py-2 text-nexa-text-secondary">XML Alanı</th><th className="text-left py-2 text-nexa-text-secondary">→ THYRONIX Alanı</th></tr></thead>
                <tbody className="divide-y divide-nexa-border">{j.map((m: any, i: number) => (
                  <tr key={i}><td className="py-1.5 text-nexa-text font-mono">{m.xml}</td><td className="py-1.5 text-nexa-primary font-mono">{m.thyronix}</td></tr>
                ))}</tbody></table>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {activeTab === "feed" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><span className="text-lg font-bold text-nexa-primary">{j.score}/100</span></div>
                {j.issues?.map((i: string, n: number) => <p key={n} className="text-xs text-nexa-danger">✗ {i}</p>)}
                {j.suggestions?.map((s: string, n: number) => <p key={n} className="text-xs text-nexa-success">→ {s}</p>)}
              </div>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {activeTab === "attrs" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(j).map(([k, v]) => (
                  <div key={k} className="p-2 rounded bg-nexa-bg/50"><span className="text-nexa-text-secondary capitalize">{k}:</span> <span className="text-nexa-text">{typeof v === "string" ? v : JSON.stringify(v)}</span></div>
                ))}
              </div>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {activeTab === "private" && result.content ? (() => { try { const j = JSON.parse(result.content); return (
              <div className="space-y-3">
                <div className="p-3 rounded bg-nexa-bg/50"><p className="text-[10px] text-nexa-text-secondary mb-1">Title</p><p className="text-sm text-nexa-text">{j.title}</p></div>
                <div className="p-3 rounded bg-nexa-bg/50"><p className="text-[10px] text-nexa-text-secondary mb-1">Description</p><p className="text-xs text-nexa-text">{j.description?.substring(0, 500)}</p></div>
              </div>
            ); } catch { return <div className="text-sm text-nexa-text">{result.content}</div>; } })() : null}

            {(activeTab === "title" || activeTab === "desc" || activeTab === "bulk" || activeTab === "consultant") && (
              <div className="space-y-2">
                <div className="p-4 rounded-lg bg-nexa-bg/50 text-sm text-nexa-text leading-relaxed whitespace-pre-wrap">{result.content || previewHtml}</div>
                {activeTab !== "consultant" && <button onClick={() => { navigator.clipboard.writeText(result.content || previewHtml); toast.success("Kopyalandı"); }} className="px-3 py-1 text-xs text-nexa-primary hover:bg-nexa-primary/10 rounded">Kopyala</button>}
              </div>
            )}

            {result.usage && (
              <div className="text-[10px] text-nexa-text-secondary border-t border-nexa-border pt-2 mt-2 flex gap-3">
                <span>{result.usage.totalTokens} tok</span>
                <span>${result.cost?.toFixed(6) || "0"}</span>
                <span>{result.duration}ms</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
