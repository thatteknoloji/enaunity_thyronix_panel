"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, ArrowLeft, RefreshCw, Store, Eye, X, Zap, Package, Truck, Phone, MapPin, CreditCard, Image as ImageIcon, Printer, Barcode,
} from "lucide-react";
import toast from "react-hot-toast";

interface Conn { id: string; dealerId: string; platform: string; sellerId: string; apiKey: string; active: boolean; lastSyncAt: string | null; matchMethod: string; dealer: { id: string; company: string; name: string; balance: number }; }
interface Item { id: string; productName: string; barcode: string; quantity: number; unitPrice: number; total: number; productImage: string; productCategory: string; productSku: string; matchedProductId: string; }
interface Order { id: string; platform: string; platformOrderId: string; customerName: string; customerPhone: string; customerAddress: string; customerCity: string; totalAmount: number; status: string; processed: boolean; connection: { platform: string; dealer: { company: string; name: string } }; items: Item[]; createdAt: string; }

const PLATFORMS: Record<string, string> = { trendyol: "Trendyol", hepsiburada: "Hepsiburada", n11: "N11" };
const STATUS: Record<string, { l: string; c: string }> = {
  new: { l: "Yeni", c: "bg-blue-100 text-blue-700" },
  processing: { l: "İşleniyor", c: "bg-yellow-100 text-yellow-700" },
  completed: { l: "Tamamlandı", c: "bg-green-100 text-green-700" },
  pending_payment: { l: "Bakiye Bekliyor", c: "bg-ena-primary/10 text-ena-primary" },
  cancelled: { l: "İptal", c: "bg-gray-100 text-gray-600" },
  awaiting_status: { l: "Statü Bekliyor", c: "bg-purple-100 text-purple-700" },
};

export default function LegacyMarketplacePage() {
  const [data, setData] = useState<{ connections: Conn[]; orders: Order[] }>({ connections: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dealers, setDealers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [form, setForm] = useState({ dealerId: "", platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/marketplace");
    const d = await res.json();
    if (d.success) setData(d.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/dealers").then(r => r.json()).then(d => { if (d.success) setDealers(d.data || []); });
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
      const d = await res.json();
      if (d.success) { toast.success(`${d.data.totalPulled} sipariş çekildi, ${d.data.totalProcessed} işlendi, ${d.data.totalMatched} eşleşti`); load(); }
      else toast.error(d.error || "Hata");
    } catch { toast.error("Senkronizasyon hatası"); }
    setSyncing(false);
  };

  const handleToggle = async (id: string) => {
    await fetch("/api/admin/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bağlantıyı sil?")) return;
    await fetch("/api/admin/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  };

  const handleSave = async () => {
    if (!form.dealerId || !form.sellerId || !form.apiKey) return toast.error("Bayi, Seller ID ve API Key zorunlu");
    const res = await fetch("/api/admin/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    const d = await res.json();
    if (d.success) { toast.success("Oluşturuldu"); load(); setShowForm(false); setForm({ dealerId: "", platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" }); }
    else toast.error(d.error || "Hata");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1"><h1 className="text-3xl font-bold text-gray-900">Pazar Yeri Entegrasyonu</h1><p className="mt-1 text-sm text-gray-500">Bayi pazaryeri bağlantıları ve sipariş yönetimi</p></div>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} className="mr-1" />Yenile</Button>
        <Button size="sm" onClick={handleSync} disabled={syncing} className="bg-green-600 hover:bg-green-700"><Zap size={14} className="mr-1" />{syncing ? "Çekiliyor..." : "Siparişleri Çek"}</Button>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={16} className="mr-1" />Bağlantı Ekle</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Pazar Yeri Bağlantısı</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Bayi</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.dealerId} onChange={e => setForm({ ...form, dealerId: e.target.value })}><option value="">Seçiniz</option>{dealers.map((d: any) => <option key={d.id} value={d.id}>{d.company || d.name} — ₺{d.balance}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Platform</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}><option value="trendyol">Trendyol</option><option value="hepsiburada">Hepsiburada</option><option value="n11">N11</option></select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Seller ID</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })} placeholder="Trendyol seller ID" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">API Key</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">API Secret</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono" value={form.apiSecret} onChange={e => setForm({ ...form, apiSecret: e.target.value })} /></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Eşleştirme Yöntemi</label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.matchMethod} onChange={e => setForm({ ...form, matchMethod: e.target.value })}>
              <option value="product_name">Ürün Adı</option><option value="barcode">Barkod</option><option value="sku">Model Kod (SKU)</option><option value="category">Kategori</option>
            </select>
          </div>
          <div className="flex gap-2"><Button size="sm" onClick={handleSave}>Kaydet</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>İptal</Button></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {data.connections.map(c => (
          <div key={c.id} className={`rounded-xl border p-4 ${c.active ? "bg-white border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{PLATFORMS[c.platform]}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggle(c.id)} className={c.active ? "text-green-600" : "text-gray-400"} title={c.active ? "Aktif" : "Pasif"}>{c.active ? <Zap size={14} /> : <Zap size={14} className="opacity-30" />}</button>
                <button onClick={() => handleDelete(c.id)} className="text-ena-primary hover:text-ena-primary"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900">{c.dealer.company || c.dealer.name}</p>
            <p className="text-[10px] text-gray-400 font-mono">Seller: {c.sellerId}</p>
            <p className="text-[10px] text-gray-400">Bakiye: ₺{c.dealer.balance.toFixed(2)} | Eşleşme: {c.matchMethod === "barcode" ? "Barkod" : c.matchMethod === "sku" ? "SKU" : c.matchMethod === "category" ? "Kategori" : "Ürün Adı"}</p>
            {c.lastSyncAt && <p className="text-[10px] text-gray-300 mt-1">Son: {new Date(c.lastSyncAt).toLocaleString("tr-TR")}</p>}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Package size={16} /> Siparişler ({data.orders.length})</h2>
      {loading ? <p className="text-gray-400 text-center py-8">Yükleniyor...</p> : data.orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><Package size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz sipariş yok. "Siparişleri Çek" butonuna tıkla.</p></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sipariş No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Müşteri / Adres</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ürünler</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-16">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.orders.map(o => {
                const s = STATUS[o.status] || { l: o.status, c: "bg-gray-100" };
                const hasImage = o.items.some(i => i.productImage);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><span className="text-xs font-semibold text-purple-700">{PLATFORMS[o.platform] || o.platform}</span></td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{o.platformOrderId}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">{o.connection?.dealer?.company || o.connection?.dealer?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{o.customerName || "—"}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin size={10} />{o.customerCity}</p>
                      {o.customerPhone && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Phone size={10} />{o.customerPhone}</p>}
                      {o.customerAddress && <p className="text-[10px] text-gray-300 truncate max-w-[180px]">{o.customerAddress}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {hasImage && <ImageIcon size={14} className="text-blue-400 shrink-0" />}
                        <div>
                          {o.items.slice(0, 3).map((i, idx) => (
                            <p key={idx} className="text-[11px] text-gray-700 truncate max-w-[180px]">
                              {i.productCategory && <span className="text-[9px] text-gray-400 mr-1">[{i.productCategory}]</span>}
                              {i.productName} <span className="text-gray-400">x{i.quantity}</span>
                            </p>
                          ))}
                          {o.items.length > 3 && <p className="text-[10px] text-gray-400">+{o.items.length - 3} kalem daha</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 text-right">₺{o.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.c}`}>{s.l}</span></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setSelected(o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-10 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 my-8" onClick={e => e.stopPropagation()} id="order-detail">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{PLATFORMS[selected.platform]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS[selected.status]?.c}`}>{STATUS[selected.status]?.l}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Sipariş #{selected.platformOrderId}</h3>
                <p className="text-xs text-gray-400">Oluşturma: {new Date(selected.createdAt).toLocaleString("tr-TR")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  const w = window.open("", "_blank", "width=800,height=900");
                  if (!w) return;
                  const dealer = selected.connection?.dealer;
                  const items = selected.items.map(i => `
                    <tr>
                      <td style="padding:8px;border:1px solid #ddd;font-size:12px">${i.productName}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:12px">${i.quantity}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:right;font-size:12px">₺${i.unitPrice.toFixed(2)}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:right;font-size:12px">₺${i.total.toFixed(2)}</td>
                    </tr>`).join("");
                  w.document.write(`
                    <html><head><title>Kargo İrsaliyesi - ${selected.platformOrderId}</title>
                    <style>
                      body { font-family: system-ui, sans-serif; margin: 30px; color: #111; }
                      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                      .header h1 { font-size: 22px; margin: 0; }
                      .header .logo { font-size: 24px; font-weight: 900; }
                      .header .logo span { color: #e50914; }
                      .section { margin-bottom: 20px; }
                      .section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin: 0 0 8px 0; border-bottom: 1px solid #eee; padding-bottom: 4px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                      .grid p { margin: 3px 0; font-size: 13px; }
                      .grid .label { color: #666; font-size: 10px; text-transform: uppercase; }
                      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                      th { background: #f5f5f5; padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
                      .total { text-align: right; margin-top: 15px; }
                      .total p { font-size: 18px; font-weight: 900; margin: 5px 0; }
                      .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; font-size: 10px; color: #999; text-align: center; }
                      .barcode { font-family: monospace; font-size: 14px; background: #f0f0f0; padding: 8px 16px; display: inline-block; border-radius: 4px; margin: 5px 0; }
                      @media print { body { margin: 10px; } }
                    </style></head><body>
                      <div class="header">
                        <div>
                          <div class="logo">ENA<span>UNITY</span></div>
                          <p style="font-size:11px;color:#666;margin:2px 0">B4B Platform</p>
                        </div>
                        <div style="text-align:right">
                          <h1>KARGO İRSALİYESİ</h1>
                          <p style="font-size:12px;margin:2px 0">Sipariş: <strong>${selected.platformOrderId}</strong></p>
                          <p style="font-size:11px;color:#666;margin:2px 0">Tarih: ${new Date(selected.createdAt).toLocaleDateString("tr-TR")}</p>
                          <div class="barcode">*${selected.platformOrderId}*</div>
                        </div>
                      </div>
                      <div class="section"><h3>Gönderici (Bayi)</h3>
                        <p><strong>${dealer?.company || dealer?.name || "—"}</strong></p>
                      </div>
                      <div class="section"><h3>Alıcı / Teslimat</h3>
                        <p><strong>${selected.customerName || "—"}</strong></p>
                        ${selected.customerPhone ? `<p>📞 ${selected.customerPhone}</p>` : ""}
                        <p>📍 ${selected.customerCity || ""}</p>
                        <p>${selected.customerAddress || ""}</p>
                      </div>
                      <div class="section"><h3>Sipariş Kalemleri</h3>
                        <table>
                          <thead><tr><th>Ürün</th><th style="text-align:center;width:60px">Adet</th><th style="text-align:right;width:90px">Birim</th><th style="text-align:right;width:90px">Toplam</th></tr></thead>
                          <tbody>${items}</tbody>
                        </table>
                      </div>
                      <div class="total"><p>Toplam: ₺${selected.totalAmount.toFixed(2)}</p></div>
                      <div class="footer">
                        <p>© ${new Date().getFullYear()} Enaunity®. Powered by ThatTeknoloji®</p>
                        <p>Bu belge elektronik olarak oluşturulmuştur, imza gerektirmez.</p>
                      </div>
                    </body></html>`);
                  w.document.close();
                  setTimeout(() => w.print(), 500);
                }}><Printer size={14} className="mr-1" />Kargo Etiketi</Button>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <p className="text-[10px] text-blue-500 uppercase font-semibold mb-2 flex items-center gap-1"><Truck size={12} />Kargo / Müşteri</p>
                  <p className="text-sm font-bold text-gray-900">{selected.customerName || "—"}</p>
                  {selected.customerPhone && <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><Phone size={11} />{selected.customerPhone}</p>}
                  {selected.customerCity && <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><MapPin size={11} />{selected.customerCity}</p>}
                  {selected.customerAddress && <p className="text-xs text-gray-500 mt-1">{selected.customerAddress}</p>}
                </div>
                <div className="p-4 rounded-xl bg-green-50/50 border border-green-100">
                  <p className="text-[10px] text-green-500 uppercase font-semibold mb-2 flex items-center gap-1"><CreditCard size={12} />Bayi & Platform</p>
                  <p className="text-sm font-bold text-gray-900">{selected.connection?.dealer?.company || selected.connection?.dealer?.name || "—"}</p>
                  <p className="text-xs text-gray-500 mt-1">Platform: {PLATFORMS[selected.platform]}</p>
                  <p className="text-lg font-black text-gray-900 mt-2">₺{selected.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Sipariş Kalemleri ({selected.items.length})</p>
                <div className="space-y-3">
                  {selected.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <Package size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                        {item.productCategory && <p className="text-[10px] text-gray-500">Kategori: {item.productCategory}</p>}
                        {item.productSku && <p className="text-[10px] text-gray-400 font-mono">SKU: {item.productSku}</p>}
                        {item.barcode && <p className="text-[10px] text-gray-400 font-mono">Barkod: {item.barcode}</p>}
                        {item.matchedProductId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Eşleşti</span>}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-500">{item.quantity} adet</span>
                          <span className="text-gray-500">×</span>
                          <span className="font-medium text-gray-700">₺{item.unitPrice.toFixed(2)}</span>
                          <span className="text-gray-300">=</span>
                          <span className="font-bold text-gray-900">₺{item.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Ara Toplam</span><span className="font-medium">₺{selected.totalAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="font-bold text-gray-900">Genel Toplam</span><span className="text-xl font-black text-green-600">₺{selected.totalAmount.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #order-detail, #order-detail * { visibility: visible; }
          #order-detail { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
