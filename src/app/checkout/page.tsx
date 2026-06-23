"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { User } from "@/types";
import { ChevronLeft, Building2, Tag, AlertTriangle, Clock, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import Link from "next/link";
import { PaymentCheckoutPanel } from "@/components/payments/PaymentCheckoutPanel";

interface DealerInfo {
  discountRate: number;
  creditLimit: number;
  openingBalance: number;
  group: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, fetchCart, clearCart } = useCartStore();
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [taxId, setTaxId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dealer, setDealer] = useState<DealerInfo | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponName, setCouponName] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [paymentTerm, setPaymentTerm] = useState<{ days: number; rate: number } | null>(null);
  const PLATFORMS = [
    { value: "", label: "Platform Seçin", shipping: 0, hasFree: true },
    { value: "trendyol", label: "Trendyol", shipping: 0, hasFree: true },
    { value: "hepsiburada", label: "Hepsiburada", shipping: 0, hasFree: true },
    { value: "idefix", label: "İdefix", shipping: 0, hasFree: true },
    { value: "n11", label: "N11", shipping: 0, hasFree: true },
    { value: "temu", label: "Temu", shipping: 0, hasFree: true },
    { value: "amazon-tr", label: "Amazon TR", shipping: 0, hasFree: true },
    { value: "amazon-global", label: "Amazon Global", shipping: 0, hasFree: true },
    { value: "own", label: "Kendi Sitem", shipping: 149.90, hasFree: false },
  ];
  const [platform, setPlatform] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [sameAddress, setSameAddress] = useState(true);
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ fileName: string; fileUrl: string; fileType: string }>>([]);
  const [campaignDiscount, setCampaignDiscount] = useState(0);
  const [campaignFreeShip, setCampaignFreeShip] = useState(false);
  const [campaignLabel, setCampaignLabel] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [minOrderErrors, setMinOrderErrors] = useState<string[]>([]);

  const [paymentDealerId, setPaymentDealerId] = useState<string | null>(null);
  const [paymentAlternatives, setPaymentAlternatives] = useState<string[]>([]);
  const [showOnlineSuggestion, setShowOnlineSuggestion] = useState(false);

  const isDealer = !!dealer;
  const canUseDealerPayment = !!paymentDealerId;
  const showGatewayPaymentPanel = canUseDealerPayment || user?.role === "admin";

  useEffect(() => {
    fetchCart();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.data) { router.push("/auth/login?redirect=/checkout"); return; }
      setUser(d.data);
      if (d.data.dealerId) {
        setPaymentDealerId(d.data.dealerId);
        fetch("/api/dealer/profile").then((r) => r.json()).then((p) => {
          if (p.success) {
            setDealer(p.data);
            if (p.data.paymentTerm) {
              setPaymentTerm({ days: p.data.paymentTerm.days, rate: p.data.paymentTerm.rate });
            }
            if (p.data.dealerGroup?.minOrderAmount) {
              setMinOrderAmount(p.data.dealerGroup.minOrderAmount);
            }
          }
        });
      }
    }).finally(() => setLoading(false));
  }, [fetchCart, router]);

  useEffect(() => {
    if (items.length === 0) return;
    const cartTotal = items.reduce((s, i) => s + (i.effectivePrice ?? i.product.price) * i.quantity, 0);
    fetch("/api/campaigns").then(r => r.json()).then(d => {
      const campaigns = d.data || [];
      let maxDiscount = 0; let label = ""; let freeShip = false;
      for (const c of campaigns) {
        if (!c.active) continue;
        if (c.startsAt && new Date(c.startsAt) > new Date()) continue;
        if (c.endsAt && new Date(c.endsAt) < new Date()) continue;
        if (c.minAmount > 0 && cartTotal < c.minAmount) continue;
        if (c.type === "free_shipping") { freeShip = true; label = c.badge || "Kargo Bedava"; }
        else if (c.type === "quantity_discount") {
          const buyIds = (c.products || []).filter((p: any) => p.type === "buy").map((p: any) => p.productId);
          const hasProduct = buyIds.length === 0 || items.some((i: any) => buyIds.includes(i.productId));
          const totalQty = items.reduce((s: number, i: any) => s + i.quantity, 0);
          if (hasProduct && totalQty >= c.minQuantity) {
            const d = c.discountType === "percentage" ? cartTotal * (c.discountValue / 100) : c.discountValue;
            if (d > maxDiscount) { maxDiscount = Math.min(d, c.maxDiscount || d); label = c.badge || c.name; }
          }
        }
      }
      setCampaignDiscount(maxDiscount);
      setCampaignLabel(label);
      setCampaignFreeShip(freeShip);
    });
  }, [items]);

  const rawTotal = items.reduce((sum, i) => sum + (i.effectivePrice ?? i.product.price) * i.quantity, 0);
  const termFeeAmount = paymentTerm?.rate ? Math.round(rawTotal * (paymentTerm.rate / 100) * 100) / 100 : 0;
  const selectedPlatform = PLATFORMS.find(p => p.value === platform);
  const isOwnSite = platform === "own";
  const effectiveShipping = campaignFreeShip ? 0 : (isOwnSite ? shippingCost : 0);
  const total = rawTotal - couponDiscount - campaignDiscount + termFeeAmount + effectiveShipping;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    const res = await fetch("/api/check-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, cartTotal: rawTotal }),
    });
    const data = await res.json();
    if (data.success) {
      setCouponDiscount(data.data.discount);
      setCouponName(data.data.code);
      window.sessionStorage.setItem("couponData", JSON.stringify({ id: data.data.id, discount: data.data.discount }));
    } else {
      setCouponError(data.error);
      setCouponDiscount(0);
      setCouponName("");
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponName("");
    setCouponError("");
    window.sessionStorage.removeItem("couponData");
  };

  const submitOrder = async (paymentMethod?: string, installmentCount = 1) => {
    if (!platform) { setError("Lütfen bir platform seçin"); return false; }
    const addrToCheck = sameAddress ? invoiceAddress : deliveryAddress;
    if (!invoiceAddress.trim() || !addrToCheck.trim()) { setError("Adres bilgilerini doldurun"); return false; }
    if (canUseDealerPayment && !paymentMethod) {
      setError("Bayi siparişi için lütfen bir ödeme yöntemi seçin.");
      return false;
    }
    setSubmitting(true);
    setError("");

    if (minOrderAmount > 0 && total < minOrderAmount) {
      setError(`Minimum sipariş tutarı ${formatPrice(minOrderAmount)}. Şu anki tutar: ${formatPrice(total)}`);
      setSubmitting(false);
      return false;
    }

    const qtyErrors: string[] = [];
    for (const item of items) {
      if (item.quantity < (item.product.minOrderQuantity || 1)) {
        qtyErrors.push(`${item.product.name}: minimum ${item.product.minOrderQuantity} adet`);
      }
    }
    if (qtyErrors.length > 0) {
      setError(`Minimum sipariş adetleri karşılanmadı:\n${qtyErrors.join("\n")}`);
      setSubmitting(false);
      return false;
    }

    const fullAddress = sameAddress
      ? `Firma: ${company} | VKN: ${taxId} | Fatura: ${invoiceAddress} | Teslimat: ${invoiceAddress}`
      : `Firma: ${company} | VKN: ${taxId} | Fatura: ${invoiceAddress} | Teslimat: ${deliveryAddress}`;

    const body: Record<string, unknown> = {
      address: fullAddress,
      platform: platform || "own",
      company,
      taxId,
      invoiceAddress,
      deliveryAddress: sameAddress ? invoiceAddress : deliveryAddress,
      sameAddress,
      couponDiscount,
      campaignDiscount,
      campaignLabel,
      campaignFreeShip,
      shippingCost: effectiveShipping,
    };
    if (paymentTerm) { body.paymentTermDays = paymentTerm.days; body.paymentTermRate = paymentTerm.rate; }
    if (attachments.length > 0) body.attachments = attachments;
    if (paymentMethod) {
      body.paymentMethod = paymentMethod;
      body.installmentCount = installmentCount;
    }
    const stored = window.sessionStorage.getItem("couponData");
    if (stored) {
      const parsed = JSON.parse(stored);
      body.couponId = parsed.id;
      body.discount = parsed.discount;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      clearCart();
      window.sessionStorage.removeItem("couponData");
      if (data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
        return true;
      }
      if (data.data?.paymentId && paymentMethod && paymentMethod !== "DEALER_ACCOUNT") {
        if (user?.role === "admin") {
          const orderId = data.data.order?.id;
          router.push(orderId ? `/admin/orders/${orderId}` : "/admin/orders");
          return true;
        }
        router.push(`/payment/pending?module=B2B_ORDER&plan=${data.data.order?.id || ""}&paymentId=${data.data.paymentId}`);
        return true;
      }
      if (user?.role === "admin") {
        const orderId = data.data.order?.id;
        router.push(orderId ? `/admin/orders/${orderId}` : "/admin/orders");
      } else if (isDealer) {
        const orderId = data.data.order?.id;
        router.push(orderId ? `/dealer/orders/${orderId}` : "/dealer/orders");
      } else {
        router.push("/account");
      }
      return true;
    }
    setError(data.error || "Sipariş oluşturulamadı");
    if (data.code === "INSUFFICIENT_BALANCE" && data.alternatives?.length) {
      setPaymentAlternatives(data.alternatives);
      setShowOnlineSuggestion(true);
    }
    setSubmitting(false);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showGatewayPaymentPanel) {
      setError("Lütfen yukarıdan bir ödeme yöntemi seçin.");
      return;
    }
    await submitOrder();
  };

  const handleOnlinePayment = async (method: string, installmentCount: number) => {
    await submitOrder(method, installmentCount);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    for (let i=0;i<files.length;i++) fd.append("files",files[i]);
    const res = await fetch("/api/upload",{method:"POST",body:fd});
    if(res.ok){const d=await res.json();setAttachments([...attachments,...(d.data||[])]);}
    setUploading(false);
  };

  const removeAttachment = (i:number) => setAttachments(attachments.filter((_,j)=>j!==i));

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-12 animate-pulse space-y-4"><div className="h-8 w-1/3 rounded bg-ena-gray" /><div className="h-64 rounded bg-ena-gray" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-6">
          <ChevronLeft size={16} /> Alışverişe Devam Et
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 text-ena-primary mb-2">
          <Building2 size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">B4B Sipariş</span>
        </div>
        <h1 className="text-3xl font-black text-ena-text mb-8">Sipariş Onayı</h1>
      </motion.div>

      {isDealer && dealer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded border border-blue-500/30 bg-blue-500/10 p-4 mb-6 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-ena-light">Kredi Limiti</span>
            <span className="font-bold text-ena-text">{formatPrice(dealer.creditLimit + dealer.openingBalance)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-ena-light">Bu Sipariş</span>
            <span className="font-bold text-ena-primary">{formatPrice(total)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-ena-light">Grup</span>
            <span className="font-semibold text-ena-text uppercase">{dealer.group}</span>
          </div>
          {total > dealer.creditLimit + dealer.openingBalance && (
            <div className="flex items-center gap-2 mt-2 text-ena-primary font-semibold">
              <AlertTriangle size={16} /> Kredi limitiniz aşıldı!
            </div>
          )}
          {minOrderAmount > 0 && (
            <div className={`flex items-center gap-2 mt-2 ${total < minOrderAmount ? "text-amber-400" : "text-emerald-400"} font-semibold`}>
              <AlertTriangle size={16} />
              {total < minOrderAmount
                ? `Minimum sipariş tutarı: ${formatPrice(minOrderAmount)} (${formatPrice(total - minOrderAmount)} eksik)`
                : `Minimum sipariş tutarı karşılandı (${formatPrice(minOrderAmount)})`}
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded border border-ena-border bg-ena-card/40 p-6 mb-8"
      >
        <h2 className="font-bold text-ena-text mb-4">Sipariş Özeti</h2>
        <div className="space-y-3">
          {items.map((item) => {
            const itemPrice = item.effectivePrice ?? item.product.price;
            const itemTotal = itemPrice * item.quantity;
            return (
              <div key={item.id} className="flex items-center justify-between border-b border-ena-border pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={item.product.image} alt={item.product.name} className="h-12 w-12 rounded object-cover shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-ena-text truncate">{item.product.name}</p>
                    <p className="text-xs text-ena-light">Adet: {item.quantity} x {formatPrice(itemPrice)}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-ena-primary shrink-0">{formatPrice(itemTotal)}</p>
              </div>
            );
          })}
        </div>

        {/* Coupon */}
        <div className="mt-4">
          {couponName ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-sm">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">{couponName}</span>
                <span className="text-ena-light">-{formatPrice(couponDiscount)}</span>
              </div>
              <button onClick={removeCoupon} className="text-ena-primary hover:text-red-300 text-xs">Kaldır</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Kupon kodu"
                className="flex-1 rounded border border-ena-border bg-ena-card/40 px-3 py-2 text-sm text-ena-text placeholder:text-ena-light focus:outline-none focus:border-ena-primary"
              />
              <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 rounded bg-ena-primary text-white text-sm font-medium hover:brightness-90 transition-colors disabled:opacity-50">
                {couponLoading ? "..." : "Uygula"}
              </button>
            </div>
          )}
          {couponError && <p className="text-xs text-ena-primary mt-1">{couponError}</p>}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          {isDealer && (
            <div className="flex justify-between text-green-400">
              <div className="flex items-center gap-1">
                <Tag size={14} />
                <span>Bayi İndirimi (%{dealer?.discountRate || 0})</span>
              </div>
            </div>
          )}
          {paymentTerm && paymentTerm.rate > 0 && (
            <div className="flex justify-between text-amber-400">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{paymentTerm.days} Gün Vade (%{paymentTerm.rate})</span>
              </div>
              <span>+{formatPrice(termFeeAmount)}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Kupon İndirimi</span>
              <span>-{formatPrice(couponDiscount)}</span>
            </div>
          )}
          {campaignDiscount > 0 && (
            <div className="flex justify-between text-ena-primary">
              <span>🎯 {campaignLabel}</span>
              <span>-{formatPrice(campaignDiscount)}</span>
            </div>
          )}
          {campaignFreeShip && (
            <div className="flex justify-between text-emerald-400">
              <span>🚚 {campaignLabel}</span>
              <span>Bedava</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-ena-text border-t border-ena-border pt-2 mt-2">
            <span>Genel Toplam</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded bg-ena-primary/50/10 border border-ena-primary/30 p-3 mb-4 text-sm text-ena-primary whitespace-pre-line">
          {error}
          {showOnlineSuggestion && paymentAlternatives.length > 0 && (
            <p className="mt-2 text-ena-text">
              Alternatif: Aşağıdaki online ödeme panelinden{" "}
              {paymentAlternatives.map((m) => (m === "BANK_TRANSFER" ? "Havale/EFT" : m === "ESNEKPOS" ? "Kredi Kartı" : m)).join(" veya ")}{" "}
              ile tamamlayabilirsiniz.
            </p>
          )}
        </div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <h2 className="font-bold text-ena-text">Satış Platformu</h2>
        <div className="rounded border border-ena-border bg-ena-card/40 p-4">
          <select value={platform} onChange={e => { setPlatform(e.target.value); setShippingCost(PLATFORMS.find(p => p.value === e.target.value)?.shipping || 0); }}
            className="w-full rounded-lg border border-ena-border bg-ena-card/60 px-3 py-2.5 text-sm text-ena-text focus:outline-none focus:border-ena-primary">
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}{p.hasFree ? " (Ücretsiz Kargo)" : p.shipping > 0 ? ` (Kargo: ${formatPrice(p.shipping)})` : ""}</option>)}
          </select>
          {platform && (
            <div className="mt-3 text-xs text-ena-light leading-relaxed bg-ena-dark/30 rounded p-3">
              {isOwnSite ? (
                <span>Kendi sitenizden gelen siparişlerde <strong className="text-ena-text">kargo ücreti {formatPrice(effectiveShipping)}</strong> sepete yansıtılır. Fatura ve teslimat adreslerini ayrı ayrı girebilirsiniz.</span>
              ) : (
                <span>Pazaryeri siparişlerinde <strong className="text-ena-text">kargo ücretsizdir</strong>. Fatura adresi bayi adresiniz, teslimat adresi ise kargo şablonundaki adrestir.</span>
              )}
            </div>
          )}
        </div>

        <h2 className="font-bold text-ena-text">Firma Bilgileri</h2>
        <Input id="company" label="Firma Adı" placeholder="Firma adınız" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <Input id="taxId" label="Vergi Numarası" placeholder="VKN / TCKN" value={taxId} onChange={(e) => setTaxId(e.target.value)} required />

        <h2 className="font-bold text-ena-text">Fatura Adresi</h2>
        <Input id="invoiceAddress" label="" placeholder="Mahalle, Sokak, Apartman, Daire, Şehir..." value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} required />

        <div className="flex items-center gap-2">
          <input type="checkbox" id="sameAddress" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} className="rounded border-ena-border bg-ena-card/60" />
          <label htmlFor="sameAddress" className="text-sm text-ena-light">Teslimat adresi fatura adresi ile aynı</label>
        </div>

        {!sameAddress && (
          <div>
            <h2 className="font-bold text-ena-text">Teslimat Adresi</h2>
            <Input id="deliveryAddress" label="" placeholder="Mahalle, Sokak, Apartman, Daire, Şehir..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
            {isOwnSite && <p className="text-xs text-amber-400 mt-1">Kendi sitem siparişlerinde teslimat adresi fatura adresinden farklıysa mutlaka eksiksiz doldurulmalıdır.</p>}
          </div>
        )}

        {platform && !isOwnSite && (
          <div className="text-xs text-ena-light bg-ena-card/40 rounded-lg p-3 leading-relaxed border border-ena-border">
            <strong className="text-ena-text">ℹ️ Pazaryeri Siparişlerinde Adres Bilgisi:</strong><br/>
            Fatura adresi olarak bayi adresiniz (firma bilgileriniz) kullanılır. Teslimat ise siparişin geldiği pazaryerindeki kargo şablonunda kayıtlı adrese göre yapılır. Bu nedenle teslimat adresi girmenize gerek yoktur.
          </div>
        )}

        {isOwnSite && shippingCost > 0 && (
          <div className="flex justify-between text-sm text-ena-light border-t border-ena-border pt-2">
            <span>Kargo Ücreti</span>
            <span className="font-bold text-ena-text">{formatPrice(effectiveShipping)}</span>
          </div>
        )}

        {/* Dosya Ekleme */}
        <div className="rounded border border-dashed border-ena-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-ena-light">
            <Paperclip size={16} /> <span>Belge/Görsel Ekle (opsiyonel)</span>
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-ena-card/50 border border-ena-border rounded-lg px-2.5 py-1.5 text-xs">
                  {att.fileType === "image" ? <ImageIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-amber-400" />}
                  <span className="text-ena-light truncate max-w-[120px]">{att.fileName}</span>
                  <button onClick={() => removeAttachment(i)} className="text-ena-light hover:text-ena-primary"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ena-card/50 border border-ena-border text-sm text-ena-light hover:text-ena-text hover:border-ena-text/30 cursor-pointer transition-colors">
            <Paperclip size={14} /> {uploading ? "Yükleniyor..." : "Dosya Seç (PDF, JPG, PNG)"}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {!showGatewayPaymentPanel && !isDealer && (
          <Button type="submit" className="w-full" disabled={submitting || items.length === 0}>
            {submitting ? "Sipariş oluşturuluyor..." : "Siparişi Tamamla"}
          </Button>
        )}
      </motion.form>

      {showGatewayPaymentPanel && (
        <div className="pt-4 mt-6 border-t border-ena-border">
          <p className="text-sm text-ena-light mb-3">
            {canUseDealerPayment
              ? "Ödeme yöntemini aşağıdan seçin. Bayi siparişi admin onayına gider."
              : "Ödeme yöntemini aşağıdan seçin. Admin siparişleri ödeme tamamlandıktan sonra işleme alınır."}
          </p>
          <PaymentCheckoutPanel
            amount={total}
            title="B2B Online Ödeme"
            loading={submitting}
            dealerId={paymentDealerId || undefined}
            onConfirm={handleOnlinePayment}
          />
        </div>
      )}
    </div>
  );
}
