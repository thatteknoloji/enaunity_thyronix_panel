"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, Save, ArrowLeft, Truck, Package, RefreshCw,
  Calculator, Search, MapPin, FileText, X, ExternalLink, CreditCard, TrendingUp, Building2, Download,
} from "lucide-react";
import { CARRIERS } from "@/lib/shipping-calculator";
import toast from "react-hot-toast";

interface BasitHandler { name: string; code: string; logo: string; }
interface BasitFee { desiKg: number; handlerCode: string; price: number; codFee: number | null; }
interface BasitOrder {
  id: string; barcode: string | null; type: string; status: string;
  validationFailed: boolean; createdTime: string;
  handler?: { name: string; code: string };
  handlerShipmentCode?: string;
  content?: { name: string; packages: { height: number; width: number; depth: number; weight: number }[] };
  client?: { name: string; phone: string; city: string; town: string; address: string };
  collect?: number; priceInfo?: { shipmentFee: number; totalCost: number };
  traces?: { status: string; time: string; location: string }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "Yeni", color: "bg-blue-100 text-blue-700" },
  READY_TO_SHIP: { label: "Gönderime Hazır", color: "bg-yellow-100 text-yellow-700" },
  SHIPPED: { label: "Yolda", color: "bg-purple-100 text-purple-700" },
  OUT_FOR_DELIVERY: { label: "Dağıtımda", color: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "Teslim", color: "bg-green-100 text-green-700" },
  NEEDS_SUPPORT: { label: "Destek", color: "bg-ena-primary/10 text-ena-primary" },
  DELAYED: { label: "Gecikmeli", color: "bg-amber-100 text-amber-700" },
  RETURNING: { label: "İade", color: "bg-pink-100 text-pink-700" },
  RETURNED: { label: "İade Edildi", color: "bg-gray-100 text-gray-700" },
  LOST: { label: "Kayıp", color: "bg-red-200 text-red-800" },
};

async function bk(action: string, params?: any) {
  const res = await fetch("/api/admin/basitkargo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  const d = await res.json();
  if (!d.success) throw new Error(d.error || "API error");
  return d.data;
}

export default function AdminShippingPage() {
  const [tab, setTab] = useState<"basitkargo" | "kargonomi" | "rules">("basitkargo");
  const [balance, setBalance] = useState<number | null>(null);
  const [handlers, setHandlers] = useState<BasitHandler[]>([]);
  const [desiFee, setDesiFee] = useState<BasitFee[]>([]);
  const [desiInput, setDesiInput] = useState("3");
  const [feeLoading, setFeeLoading] = useState(false);
  const [orders, setOrders] = useState<BasitOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BasitOrder | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    handlerCode: "",
    type: "OUTGOING" as "OUTGOING" | "INCOMING",
    contentName: "Enaunity Sipariş",
    contentCode: "",
    packageHeight: "10",
    packageWidth: "15",
    packageDepth: "5",
    packageWeight: "1",
    clientName: "",
    clientPhone: "",
    clientCity: "İstanbul",
    clientTown: "Kadıköy",
    clientAddress: "",
    collect: "",
    collectOnDeliveryType: "CASH" as "CASH" | "CREDIT_CARD",
  });

  // Existing shipping rules state
  const [configs, setConfigs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "category", category: "", productId: "", carrier: "Yurtiçi Kargo",
    basePrice: "0", perDesi: "0", freeOver: "0", manualPrice: "0", freeShipping: false,
  });
  const [desiCalc, setDesiCalc] = useState({ en: "", boy: "", yukseklik: "", agirlik: "", result: 0, resultDesi: 0, finalDesi: 0 });

  // Kargonomi state
  const [kgBalance, setKgBalance] = useState<{ balance: number; credit: number; currency: string } | null>(null);
  const [kgCarriers, setKgCarriers] = useState<{ id: string; code: string; name: string; logo: string }[]>([]);
  const [kgShipments, setKgShipments] = useState<any[]>([]);
  const [kgShipmentsLoading, setKgShipmentsLoading] = useState(false);
  const [kgSelectedShipment, setKgSelectedShipment] = useState<any | null>(null);
  const [kgShowForm, setKgShowForm] = useState(false);
  const [kgCreating, setKgCreating] = useState(false);
  const [kgForm, setKgForm] = useState({
    carrierId: "",
    senderName: "Enaunity",
    senderPhone: "",
    senderAddress: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverStateId: "",
    receiverCityId: "",
    packageDesi: "3",
    packageWeight: "1",
    packageWidth: "15",
    packageHeight: "10",
    packageLength: "5",
    description: "",
    referenceNumber: "",
    isCod: false,
    codAmount: "",
  });
  const [kgStates, setKgStates] = useState<{ id: number; name: string }[]>([]);
  const [kgCities, setKgCities] = useState<{ id: number; name: string }[]>([]);
  const [kgConfigError, setKgConfigError] = useState<string | null>(null);
  const [fulfillmentShipments, setFulfillmentShipments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/fulfillment/shipments")
      .then((r) => r.json())
      .then((d) => { if (d.success) setFulfillmentShipments(d.data || []); })
      .catch(() => {});
  }, []);

  const kg = async (action: string, params?: any) => {
    const res = await fetch("/api/admin/kargonomi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error || "Kargonomi API error");
    return d.data;
  };

  const loadKargonomi = useCallback(async () => {
    try {
      const [bal, carriers] = await Promise.all([kg("balance"), kg("carriers")]);
      setKgBalance(bal);
      setKgCarriers(carriers);
      setKgConfigError(null);
      if (carriers.length > 0) setKgForm(f => ({ ...f, carrierId: carriers[0].id }));
      const states = await kg("getStates");
      setKgStates(states);
    } catch (e: any) {
      setKgConfigError(e.message);
    }
  }, []);

  const loadKgShipments = async () => {
    setKgShipmentsLoading(true);
    try {
      const data = await kg("listShipments", { size: 50 });
      setKgShipments(data.items || []);
    } catch { toast.error("Kargonomi siparişleri yüklenemedi"); }
    finally { setKgShipmentsLoading(false); }
  };

  const loadBasitKargo = useCallback(async () => {
    try {
      const [bal, h] = await Promise.all([bk("balance"), bk("handlers")]);
      setBalance(bal);
      setHandlers(h);
      if (h.length > 0) setOrderForm(f => ({ ...f, handlerCode: h[0].code }));
    } catch (e: any) {
      toast.error("BasitKargo bağlantı hatası: " + e.message);
    }
  }, []);

  useEffect(() => {
    loadBasitKargo();
    loadKargonomi();
    fetch("/api/admin/shipping").then(r => r.json()).then(d => setConfigs(d.data || [])).finally(() => setLoading(false));
    fetch("/api/products?all=true").then(r => r.json()).then(d => setProducts(d.data || []));
  }, [loadBasitKargo, loadKargonomi]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await bk("filterOrders", { size: 50 });
      setOrders(data.items || []);
    } catch {
      toast.error("Siparişler yüklenemedi");
    } finally {
      setOrdersLoading(false);
    }
  };

  const queryFee = async () => {
    setFeeLoading(true);
    try {
      const data = await bk("feeByDesi", { desiKg: parseInt(desiInput) || 0 });
      setDesiFee(data);
    } catch {
      toast.error("Fiyat sorgulanamadı");
    } finally {
      setFeeLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderForm.handlerCode || !orderForm.clientName || !orderForm.clientPhone || !orderForm.clientAddress) {
      toast.error("Alıcı bilgileri ve kargo firması zorunlu");
      return;
    }
    setCreatingOrder(true);
    try {
      const input = {
        handlerCode: orderForm.handlerCode,
        type: orderForm.type,
        content: {
          name: orderForm.contentName,
          code: orderForm.contentCode || undefined,
          packages: [{
            height: parseFloat(orderForm.packageHeight) || 0,
            width: parseFloat(orderForm.packageWidth) || 0,
            depth: parseFloat(orderForm.packageDepth) || 0,
            weight: parseFloat(orderForm.packageWeight) || 0,
          }],
        },
        client: {
          name: orderForm.clientName,
          phone: orderForm.clientPhone,
          city: orderForm.clientCity,
          town: orderForm.clientTown,
          address: orderForm.clientAddress,
        },
        collect: orderForm.collect ? parseFloat(orderForm.collect) : undefined,
        collectOnDeliveryType: orderForm.collect ? orderForm.collectOnDeliveryType : undefined,
      };
      const order = await bk("createOrderWithBarcode", input);
      toast.success(`Sipariş oluşturuldu! Barkod: ${order.barcode || order.id}`);
      setShowOrderForm(false);
      loadOrders();
    } catch (e: any) {
      toast.error("Sipariş oluşturulamadı: " + e.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCancel = async (barcode: string) => {
    if (!confirm("Bu kargoyu iptal etmek istediğinize emin misiniz?")) return;
    try {
      await bk("cancelBarcode", { barcode });
      toast.success("Kargo iptal edildi");
      loadOrders();
    } catch (e: any) {
      toast.error("İptal başarısız: " + e.message);
    }
  };

  const handleKgCreate = async () => {
    if (!kgForm.carrierId || !kgForm.receiverName || !kgForm.receiverPhone || !kgForm.receiverAddress) {
      toast.error("Alıcı bilgileri ve kargo firması zorunlu");
      return;
    }
    setKgCreating(true);
    try {
      const input = {
        carrierId: kgForm.carrierId,
        senderName: kgForm.senderName || "Enaunity",
        senderPhone: kgForm.senderPhone,
        senderAddress: kgForm.senderAddress,
        receiverName: kgForm.receiverName,
        receiverPhone: kgForm.receiverPhone,
        receiverAddress: kgForm.receiverAddress,
        receiverStateId: parseInt(kgForm.receiverStateId) || 0,
        receiverCityId: parseInt(kgForm.receiverCityId) || 0,
        receiverCountryId: 1,
        packages: [{
          desi: parseInt(kgForm.packageDesi) || 3,
          weight: parseFloat(kgForm.packageWeight) || 1,
          width: parseFloat(kgForm.packageWidth) || 15,
          height: parseFloat(kgForm.packageHeight) || 10,
          length: parseFloat(kgForm.packageLength) || 5,
        }],
        description: kgForm.description || undefined,
        referenceNumber: kgForm.referenceNumber || undefined,
        isCod: kgForm.isCod,
        codAmount: kgForm.isCod ? (parseFloat(kgForm.codAmount) || 0) : undefined,
      };
      const shipment = await kg("createShipment", input);
      toast.success(`Gönderi oluşturuldu! #${shipment.referenceNumber || shipment.id}`);
      setKgShowForm(false);
      loadKgShipments();
    } catch (e: any) {
      toast.error("Gönderi oluşturulamadı: " + e.message);
    } finally {
      setKgCreating(false);
    }
  };

  const handleKgCancel = async (id: number) => {
    if (!confirm("Bu gönderiyi iptal etmek istediğinize emin misiniz?")) return;
    try {
      await kg("cancelShipment", { id });
      toast.success("Gönderi iptal edildi");
      loadKgShipments();
    } catch (e: any) {
      toast.error("İptal başarısız: " + e.message);
    }
  };

  const handleKgCityChange = async (stateId: string) => {
    setKgForm(f => ({ ...f, receiverStateId: stateId, receiverCityId: "" }));
    if (!stateId) { setKgCities([]); return; }
    try {
      const cities = await kg("getCities", { stateId: parseInt(stateId) });
      setKgCities(cities);
    } catch { setKgCities([]); }
  };

  // Existing shipping rules
  const handleSave = async () => {
    if (!form.category && !form.productId) return toast.error("Kategori veya ürün seçin");
    setSaving(true);
    const body = { ...form, basePrice: parseFloat(form.basePrice) || 0, perDesi: parseFloat(form.perDesi) || 0, freeOver: parseFloat(form.freeOver) || 0, manualPrice: parseFloat(form.manualPrice) || 0 };
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch("/api/admin/shipping", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...body } : body) });
    if (res.ok) { toast.success(editingId ? "Güncellendi" : "Eklendi"); fetch("/api/admin/shipping").then(r => r.json()).then(d => setConfigs(d.data || [])); resetForm(); }
    else toast.error("Hata");
    setSaving(false);
  };

  const resetForm = () => { setForm({ type: "category", category: "", productId: "", carrier: "Yurtiçi Kargo", basePrice: "0", perDesi: "0", freeOver: "0", manualPrice: "0", freeShipping: false }); setEditingId(null); setShowForm(false); };
  const handleDelete = async (id: string) => { if (!confirm("Silinsin mi?")) return; await fetch("/api/admin/shipping", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetch("/api/admin/shipping").then(r => r.json()).then(d => setConfigs(d.data || [])); };
  const calcDesi = () => {
    const en = parseFloat(desiCalc.en) || 0; const boy = parseFloat(desiCalc.boy) || 0; const yukseklik = parseFloat(desiCalc.yukseklik) || 0; const agirlik = parseFloat(desiCalc.agirlik) || 0;
    if (!en || !boy || !yukseklik) return;
    const desi = Math.ceil(en * boy * yukseklik / 3000);
    setDesiCalc({ ...desiCalc, result: en * boy * yukseklik, resultDesi: desi, finalDesi: Math.ceil(Math.max(agirlik, desi)) });
  };

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Kargo Yönetimi</h1><p className="mt-1 text-sm text-gray-500">BasitKargo API entegrasyonu + manuel kargo kuralları</p></div>
      </div>

      {fulfillmentShipments.length > 0 && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-100">
            <h2 className="text-sm font-semibold text-purple-900">Operasyon sipariş kargoları ({fulfillmentShipments.length})</h2>
            <p className="text-xs text-purple-700 mt-0.5">Pazaryeri / hazır ürün siparişlerine bağlı sevkiyat kayıtları</p>
          </div>
          <div className="divide-y divide-purple-100 max-h-48 overflow-y-auto bg-white">
            {fulfillmentShipments.slice(0, 20).map((s: any) => (
              <div key={s.id} className="px-4 py-2.5 flex justify-between text-xs">
                <div>
                  <span className="font-medium text-gray-800">{s.trackingNumber || "Takip yok"}</span>
                  <span className="text-gray-500 ml-2">{s.cargoCompany} · {s.order?.orderNumber}</span>
                </div>
                <span className="text-gray-500">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(["basitkargo", "kargonomi", "rules"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "basitkargo" ? "BasitKargo API" : t === "kargonomi" ? "Kargonomi API" : "Manuel Kurallar"}
          </button>
        ))}
      </div>

      {tab === "basitkargo" && (
        <div className="space-y-6">
          {/* Balance + Handlers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CreditCard size={16} /> Bakiye</h2>
                <button onClick={loadBasitKargo} className="p-1 rounded hover:bg-gray-100"><RefreshCw size={14} className="text-gray-400" /></button>
              </div>
              <p className="text-3xl font-black text-gray-900">{balance !== null ? `₺${balance.toFixed(2)}` : "—"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><Truck size={16} /> Kargo Firmaları</h2>
              <div className="flex flex-wrap gap-2">
                {handlers.map(h => (
                  <span key={h.code} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700">
                    <Truck size={12} className="text-gray-400" />{h.name}
                  </span>
                ))}
                {handlers.length === 0 && <span className="text-xs text-gray-400">Yükleniyor...</span>}
              </div>
            </div>
          </div>

          {/* Desi Fee Query */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><Calculator size={16} /> Desi/Kg ile Fiyat Sorgula</h2>
            <div className="flex gap-2 items-end">
              <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Desi/Kg</label><input type="number" className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400" value={desiInput} onChange={e => setDesiInput(e.target.value)} /></div>
              <button onClick={queryFee} disabled={feeLoading} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"><Search size={14} />{feeLoading ? "Sorgulanıyor..." : "Sorgula"}</button>
            </div>
            {desiFee.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                {desiFee.map(f => (
                  <div key={f.handlerCode} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">{f.handlerCode}</p>
                    <p className="text-lg font-bold text-gray-900">₺{f.price.toFixed(2)}</p>
                    {f.codFee !== null && <p className="text-[10px] text-amber-600">+₺{f.codFee.toFixed(2)} tahsilat</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Order */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Package size={16} /> Sipariş Oluştur</h2>
              <button onClick={() => setShowOrderForm(!showOrderForm)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                {showOrderForm ? <><X size={14} /> Kapat</> : <><Plus size={14} /> Yeni Sipariş</>}
              </button>
            </div>
            {showOrderForm && (
              <div className="p-5 space-y-4 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kargo Firması</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.handlerCode} onChange={e => setOrderForm({ ...orderForm, handlerCode: e.target.value })}>{handlers.map(h => <option key={h.code} value={h.code}>{h.name}</option>)}</select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sipariş Adı</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.contentName} onChange={e => setOrderForm({ ...orderForm, contentName: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sipariş Kodu</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.contentCode} onChange={e => setOrderForm({ ...orderForm, contentCode: e.target.value })} placeholder="Opsiyonel" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">En (cm)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.packageHeight} onChange={e => setOrderForm({ ...orderForm, packageHeight: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Boy (cm)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.packageWidth} onChange={e => setOrderForm({ ...orderForm, packageWidth: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Derinlik (cm)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.packageDepth} onChange={e => setOrderForm({ ...orderForm, packageDepth: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ağırlık (kg)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.packageWeight} onChange={e => setOrderForm({ ...orderForm, packageWeight: e.target.value })} /></div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Alıcı Bilgileri</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="block text-xs text-gray-500 mb-1">Ad Soyad *</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.clientName} onChange={e => setOrderForm({ ...orderForm, clientName: e.target.value })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Telefon *</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.clientPhone} onChange={e => setOrderForm({ ...orderForm, clientPhone: e.target.value })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Şehir</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.clientCity} onChange={e => setOrderForm({ ...orderForm, clientCity: e.target.value })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">İlçe</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.clientTown} onChange={e => setOrderForm({ ...orderForm, clientTown: e.target.value })} /></div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-500 mb-1">Adres *</label><textarea className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" rows={2} value={orderForm.clientAddress} onChange={e => setOrderForm({ ...orderForm, clientAddress: e.target.value })} /></div>
                    <div className="flex gap-4">
                      <div><label className="block text-xs text-gray-500 mb-1">Kapıda Ödeme (₺)</label><input type="number" className="w-32 rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.collect} onChange={e => setOrderForm({ ...orderForm, collect: e.target.value })} placeholder="Opsiyonel" /></div>
                      {orderForm.collect && <div><label className="block text-xs text-gray-500 mb-1">Tahsilat Tipi</label><select className="w-32 rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={orderForm.collectOnDeliveryType} onChange={e => setOrderForm({ ...orderForm, collectOnDeliveryType: e.target.value as "CASH" | "CREDIT_CARD" })}><option value="CASH">Nakit</option><option value="CREDIT_CARD">Kredi Kartı</option></select></div>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreateOrder} disabled={creatingOrder} className="bg-blue-600 hover:bg-blue-700"><Save size={14} className="mr-1" />{creatingOrder ? "Oluşturuluyor..." : "Sipariş + Barkod Oluştur"}</Button>
                  <Button variant="ghost" onClick={() => setShowOrderForm(false)}>İptal</Button>
                </div>
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={16} /> Siparişler</h2>
              <button onClick={loadOrders} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"><RefreshCw size={12} />{ordersLoading ? "Yükleniyor..." : "Yenile"}</button>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12"><Package size={32} className="mx-auto text-gray-300" /><p className="mt-2 text-sm text-gray-500">Henüz sipariş yok. "Siparişleri Yenile" ye tıklayın.</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID / Barkod</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Firma</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alıcı</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tutar</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => {
                    const st = STATUS_MAP[o.status] || { label: o.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                        <td className="px-4 py-3"><p className="text-xs font-mono text-gray-600">{o.id}</p>{o.barcode && <p className="text-[10px] text-blue-600 font-mono">{o.barcode}</p>}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{o.handler?.name || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-900">{o.client?.name || "—"}<br /><span className="text-[10px] text-gray-400">{o.client?.city} {o.client?.town}</span></td>
                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-900">{o.priceInfo ? `₺${o.priceInfo.totalCost.toFixed(2)}` : "—"}{o.collect ? <span className="text-[10px] text-amber-600 block">₺{o.collect} tahsilat</span> : null}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {o.barcode && o.status === "NEW" && <Button size="sm" variant="ghost" className="text-ena-primary text-[11px]" onClick={() => handleCancel(o.barcode!)}>İptal</Button>}
                            {o.barcode && <Button size="sm" variant="ghost" className="text-blue-600 text-[11px]" onClick={() => window.open(`https://basitkargo.com/api/label/svg/${o.id}`, "_blank")}><FileText size={12} className="mr-0.5" />Etiket</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Order Detail Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Sipariş Detayı</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedOrder.id}</p>
                    {selectedOrder.barcode && <p className="text-xs text-blue-600 font-mono">Barkod: {selectedOrder.barcode}</p>}
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-400">Firma:</span> <span className="font-medium">{selectedOrder.handler?.name || "—"}</span></div>
                    <div><span className="text-gray-400">Durum:</span> <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_MAP[selectedOrder.status]?.color || ""}`}>{STATUS_MAP[selectedOrder.status]?.label || selectedOrder.status}</span></div>
                    {selectedOrder.priceInfo && <><div><span className="text-gray-400">Kargo Ücreti:</span> <span className="font-medium">₺{selectedOrder.priceInfo.shipmentFee.toFixed(2)}</span></div><div><span className="text-gray-400">Toplam:</span> <span className="font-bold">₺{selectedOrder.priceInfo.totalCost.toFixed(2)}</span></div></>}
                    {selectedOrder.collect && <div><span className="text-gray-400">Kapıda Ödeme:</span> <span className="font-medium text-amber-600">₺{selectedOrder.collect}</span></div>}
                    {selectedOrder.handlerShipmentCode && <div><span className="text-gray-400">Takip No:</span> <span className="font-mono font-medium text-blue-600">{selectedOrder.handlerShipmentCode}</span></div>}
                  </div>
                  {selectedOrder.client && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Alıcı</p>
                      <p className="text-sm font-medium">{selectedOrder.client.name}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.client.phone}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.client.city} / {selectedOrder.client.town}</p>
                      <p className="text-xs text-gray-400">{selectedOrder.client.address}</p>
                    </div>
                  )}
                  {selectedOrder.traces && selectedOrder.traces.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Kargo Hareketleri</p>
                      <div className="space-y-2">
                        {selectedOrder.traces.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <div>
                              <p className="font-medium text-gray-700">{t.status}</p>
                              <p className="text-gray-400">{t.location} — {new Date(t.time).toLocaleString("tr-TR")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "kargonomi" && (
        <div className="space-y-6">
          {kgConfigError ? (
            <div className="rounded-xl border border-red-200 bg-ena-primary/5 p-6 text-center">
              <p className="text-ena-primary font-medium mb-2">Kargonomi API bağlanamadı</p>
              <p className="text-sm text-ena-primary mb-4">{kgConfigError}</p>
              <p className="text-xs text-gray-500">KARGONOMI_API_TOKEN ve KARGONOMI_APP_KEY (opsiyonel) .env.local dosyanızda tanımlı olmalıdır.</p>
            </div>
          ) : (
            <>
              {/* Balance + Carriers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CreditCard size={16} /> Bakiye</h2>
                    <button onClick={loadKargonomi} className="p-1 rounded hover:bg-gray-100"><RefreshCw size={14} className="text-gray-400" /></button>
                  </div>
                  {kgBalance ? (
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-gray-900">{kgBalance.currency || "₺"}{kgBalance.balance.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Kullanılabilir kredi: {kgBalance.currency || "₺"}{kgBalance.credit.toFixed(2)}</p>
                    </div>
                  ) : <p className="text-gray-400 text-sm">Yükleniyor...</p>}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><Truck size={16} /> Kargo Firmaları</h2>
                  <div className="flex flex-wrap gap-2">
                    {kgCarriers.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700">
                        <Truck size={12} className="text-gray-400" />{c.name}
                      </span>
                    ))}
                    {kgCarriers.length === 0 && <span className="text-xs text-gray-400">Yükleniyor...</span>}
                  </div>
                </div>
              </div>

              {/* Create Shipment */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Package size={16} /> Gönderi Oluştur</h2>
                  <button onClick={() => setKgShowForm(!kgShowForm)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                    {kgShowForm ? <><X size={14} /> Kapat</> : <><Plus size={14} /> Yeni Gönderi</>}
                  </button>
                </div>
                {kgShowForm && (
                  <div className="p-5 space-y-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kargo Firması</label>
                        <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.carrierId} onChange={e => setKgForm({ ...kgForm, carrierId: e.target.value })}>
                          {kgCarriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gönderen Adı</label>
                        <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.senderName} onChange={e => setKgForm({ ...kgForm, senderName: e.target.value })} />
                      </div>
                      <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gönderen Tel</label>
                        <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.senderPhone} onChange={e => setKgForm({ ...kgForm, senderPhone: e.target.value })} />
                      </div>
                      <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Referans No</label>
                        <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.referenceNumber} onChange={e => setKgForm({ ...kgForm, referenceNumber: e.target.value })} placeholder="Opsiyonel" />
                      </div>
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gönderen Adresi</label>
                      <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" rows={2} value={kgForm.senderAddress} onChange={e => setKgForm({ ...kgForm, senderAddress: e.target.value })} />
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Alıcı Bilgileri</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500 mb-1">Ad Soyad *</label>
                          <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.receiverName} onChange={e => setKgForm({ ...kgForm, receiverName: e.target.value })} />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">Telefon *</label>
                          <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.receiverPhone} onChange={e => setKgForm({ ...kgForm, receiverPhone: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div><label className="block text-xs text-gray-500 mb-1">İl *</label>
                          <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.receiverStateId} onChange={e => handleKgCityChange(e.target.value)}>
                            <option value="">Seçiniz</option>
                            {kgStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">İlçe *</label>
                          <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.receiverCityId} onChange={e => setKgForm({ ...kgForm, receiverCityId: e.target.value })}>
                            <option value="">Seçiniz</option>
                            {kgCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3"><label className="block text-xs text-gray-500 mb-1">Adres *</label>
                        <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" rows={2} value={kgForm.receiverAddress} onChange={e => setKgForm({ ...kgForm, receiverAddress: e.target.value })} />
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Paket Bilgileri</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div><label className="block text-xs text-gray-500 mb-1">Desi</label>
                          <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.packageDesi} onChange={e => setKgForm({ ...kgForm, packageDesi: e.target.value })} />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">Ağırlık (kg)</label>
                          <input type="number" step="0.1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.packageWeight} onChange={e => setKgForm({ ...kgForm, packageWeight: e.target.value })} />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">En (cm)</label>
                          <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.packageWidth} onChange={e => setKgForm({ ...kgForm, packageWidth: e.target.value })} />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">Boy (cm)</label>
                          <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.packageHeight} onChange={e => setKgForm({ ...kgForm, packageHeight: e.target.value })} />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">Derinlik (cm)</label>
                          <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.packageLength} onChange={e => setKgForm({ ...kgForm, packageLength: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={kgForm.isCod} onChange={e => setKgForm({ ...kgForm, isCod: e.target.checked })} className="w-4 h-4" />
                        <span className="font-medium text-gray-700">Kapıda Ödeme</span>
                      </label>
                      {kgForm.isCod && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-xs text-gray-500 mb-1">Tahsilat Tutarı (₺)</label>
                            <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={kgForm.codAmount} onChange={e => setKgForm({ ...kgForm, codAmount: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleKgCreate} disabled={kgCreating} className="bg-blue-600 hover:bg-blue-700">
                        <Save size={14} className="mr-1" />{kgCreating ? "Oluşturuluyor..." : "Gönderi Oluştur"}
                      </Button>
                      <Button variant="ghost" onClick={() => setKgShowForm(false)}>İptal</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipments */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={16} /> Gönderiler</h2>
                  <button onClick={loadKgShipments} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
                    <RefreshCw size={12} />{kgShipmentsLoading ? "Yükleniyor..." : "Yenile"}
                  </button>
                </div>
                {kgShipments.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={32} className="mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">Henüz gönderi yok. "Yenile" ye tıklayın.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID / Referans</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Firma</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alıcı</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tutar</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kgShipments.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setKgSelectedShipment(s)}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-mono text-gray-600">#{s.id}</p>
                            {s.referenceNumber && <p className="text-[10px] text-blue-600 font-mono">{s.referenceNumber}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{s.carrierName || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-900">
                            {s.receiverName || "—"}
                            {s.receiverPhone && <br />}
                            {s.receiverPhone && <span className="text-[10px] text-gray-400">{s.receiverPhone}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                              {s.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-900">
                            {s.shipmentFee != null ? `₺${s.shipmentFee.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                              {s.status === "NEW" && (
                                <Button size="sm" variant="ghost" className="text-ena-primary text-[11px]" onClick={() => handleKgCancel(s.id)}>İptal</Button>
                              )}
                              {s.barcode && (
                                <Button size="sm" variant="ghost" className="text-blue-600 text-[11px]" onClick={() => window.open(`https://app.kargonomi.com.tr/api/v1/shipments/${s.id}/barcode`, "_blank")}>
                                  <Download size={12} className="mr-0.5" />Barkod
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Shipment Detail Modal */}
              {kgSelectedShipment && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setKgSelectedShipment(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Gönderi Detayı</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">#{kgSelectedShipment.id}</p>
                        {kgSelectedShipment.referenceNumber && <p className="text-xs text-blue-600 font-mono">Referans: {kgSelectedShipment.referenceNumber}</p>}
                        {kgSelectedShipment.barcode && <p className="text-xs text-green-600 font-mono">Barkod: {kgSelectedShipment.barcode}</p>}
                      </div>
                      <button onClick={() => setKgSelectedShipment(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-400">Firma:</span> <span className="font-medium">{kgSelectedShipment.carrierName || "—"}</span></div>
                        <div><span className="text-gray-400">Durum:</span> <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100">{kgSelectedShipment.status || "—"}</span></div>
                        {kgSelectedShipment.shipmentFee != null && <div><span className="text-gray-400">Kargo Ücreti:</span> <span className="font-medium">₺{kgSelectedShipment.shipmentFee.toFixed(2)}</span></div>}
                        {kgSelectedShipment.totalCost != null && <div><span className="text-gray-400">Toplam:</span> <span className="font-bold">₺{kgSelectedShipment.totalCost.toFixed(2)}</span></div>}
                        {kgSelectedShipment.isCod && kgSelectedShipment.codAmount != null && (
                          <div><span className="text-gray-400">Kapıda Ödeme:</span> <span className="font-medium text-amber-600">₺{kgSelectedShipment.codAmount}</span></div>
                        )}
                        {kgSelectedShipment.description && <div className="col-span-2"><span className="text-gray-400">Açıklama:</span> <span className="font-medium">{kgSelectedShipment.description}</span></div>}
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Alıcı</p>
                        <p className="text-sm font-medium">{kgSelectedShipment.receiverName || "—"}</p>
                        <p className="text-xs text-gray-500">{kgSelectedShipment.receiverPhone}</p>
                        <p className="text-xs text-gray-400">{kgSelectedShipment.receiverAddress}</p>
                      </div>
                      {kgSelectedShipment.packages && kgSelectedShipment.packages.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Paketler</p>
                          <div className="space-y-2">
                            {kgSelectedShipment.packages.map((pkg: any, i: number) => (
                              <div key={i} className="flex items-center gap-4 text-xs p-2 rounded-lg bg-gray-50">
                                <span className="font-mono text-gray-400">#{i + 1}</span>
                                <span>{pkg.desi} desi</span>
                                <span>{pkg.weight} kg</span>
                                <span>{pkg.width}x{pkg.height}x{pkg.length} cm</span>
                                {pkg.barcode && <span className="text-blue-600 font-mono">Barkod: {pkg.barcode}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {kgSelectedShipment.barcode && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => window.open(`https://app.kargonomi.com.tr/api/v1/shipments/${kgSelectedShipment.id}/barcode`, "_blank")}>
                            <Download size={14} className="mr-1" />Barkodu İndir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "rules" && (
        <>
          {/* Desi Calculator - existing */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Package size={16} /> Desi Hesaplayıcı</h2>
            <p className="text-xs text-gray-400 mb-4">Formül: (En × Boy × Yükseklik) ÷ 3000 = Desi. Gerçek ağırlık ile desi karşılaştırılır, büyük olan fiyatlandırılır.</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">En (cm)</label><input type="number" step="1" className="w-24 rounded border border-gray-200 px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={desiCalc.en} onChange={e => setDesiCalc({ ...desiCalc, en: e.target.value })} placeholder="50" /></div>
              <span className="text-lg text-gray-300 pb-2">×</span>
              <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Boy (cm)</label><input type="number" step="1" className="w-24 rounded border border-gray-200 px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={desiCalc.boy} onChange={e => setDesiCalc({ ...desiCalc, boy: e.target.value })} placeholder="40" /></div>
              <span className="text-lg text-gray-300 pb-2">×</span>
              <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Yükseklik (cm)</label><input type="number" step="1" className="w-24 rounded border border-gray-200 px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={desiCalc.yukseklik} onChange={e => setDesiCalc({ ...desiCalc, yukseklik: e.target.value })} placeholder="30" /></div>
              <span className="text-lg text-gray-300 pb-2">|</span>
              <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Ağırlık (kg)</label><input type="number" step="0.1" className="w-24 rounded border border-gray-200 px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={desiCalc.agirlik} onChange={e => setDesiCalc({ ...desiCalc, agirlik: e.target.value })} placeholder="3" /></div>
              <button onClick={calcDesi} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">Hesapla</button>
            </div>
            {desiCalc.result > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div className="flex items-center gap-2"><span className="text-gray-500">Hacim:</span> <span className="font-mono font-bold">{desiCalc.result.toLocaleString("tr-TR")} cm³</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Formül Desi:</span> <span className="font-mono font-bold">{desiCalc.resultDesi} desi</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Gerçek Ağırlık:</span> <span className="font-mono font-bold">{parseFloat(desiCalc.agirlik) || 0} kg</span></div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200"><span className="text-gray-700 font-semibold">Fiyatlandırma Desi:</span><span className="text-xl font-black text-gray-900">{Math.max(parseFloat(desiCalc.agirlik) || 0, desiCalc.resultDesi)}</span></div>
              </div>
            )}
          </div>

          {showForm && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Düzenle" : "Yeni Kargo Kuralı"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tip</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: "", productId: "" })}><option value="category">Kategori Bazlı</option><option value="product">Ürün Bazlı</option></select></div>
                {form.type === "category" ? (
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Seçiniz</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                ) : (
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ürün</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="">Seçiniz</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                )}
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kargo Firması</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}>{CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Taban Fiyat (₺)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Desi Başı (₺)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.perDesi} onChange={e => setForm({ ...form, perDesi: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ücretsiz Kargo Limiti (₺)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.freeOver} onChange={e => setForm({ ...form, freeOver: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Manuel Fiyat (₺)</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" value={form.manualPrice} onChange={e => setForm({ ...form, manualPrice: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.freeShipping} onChange={e => setForm({ ...form, freeShipping: e.target.checked })} className="w-4 h-4" />
                  <span className="font-medium text-gray-700">🚚 Ücretsiz Kargo (şartsız)</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>İptal</Button>
              </div>
            </div>
          )}

          {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> : configs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><Truck size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz kargo kuralı tanımlanmadı</p><button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"><Plus size={14} />İlk kuralı ekle</button></div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tip</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hedef</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Firma</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fiyat</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bedava/Üst Limit</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {configs.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.type === "category" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>{c.type === "category" ? "Kategori" : "Ürün"}</span></td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{c.category || c.product?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 flex items-center gap-1.5"><Truck size={12} />{c.carrier}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.freeShipping ? "🆓 Bedava" : c.manualPrice > 0 ? `${c.manualPrice} ₺ (manuel)` : `${c.basePrice} ₺ + ${c.perDesi} ₺/desi`}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.freeOver > 0 ? `${c.freeOver} ₺ üzeri bedava` : "—"}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setForm({ type: c.type, category: c.category || "", productId: c.productId || "", carrier: c.carrier, basePrice: String(c.basePrice), perDesi: String(c.perDesi), freeOver: String(c.freeOver), manualPrice: String(c.manualPrice), freeShipping: c.freeShipping }); setEditingId(c.id); setShowForm(true); }}>Düzenle</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-ena-primary"><Trash2 size={14} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
