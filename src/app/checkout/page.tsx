"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { User } from "@/types";
import { ChevronLeft, Building2, Tag, AlertTriangle, Clock, Paperclip, X, FileText, ImageIcon, ArrowRight, MapPinned, Sparkles, BadgeCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import { PaymentCheckoutPanel } from "@/components/payments/PaymentCheckoutPanel";

interface DealerInfo {
  discountRate: number;
  creditLimit: number;
  openingBalance: number;
  group: string;
  allowNegative?: boolean;
  billingAddress?: string;
  shippingAddress?: string;
  taxNumber?: string;
  company?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, fetchCart, clearCart } = useCartStore();
  const [user, setUser] = useState<User | null>(null);
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
  const [addressSyncing, setAddressSyncing] = useState(false);

  const isDealer = !!dealer;
  const canUseDealerPayment = !!paymentDealerId;
  const showGatewayPaymentPanel = canUseDealerPayment || user?.role === "admin";

  useEffect(() => {
    fetchCart();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.data) { router.push("/auth/login?redirect=/checkout"); return; }
      setUser(d.data);
      setCompany((current) => current || d.data.company || "");
      setTaxId((current) => current || d.data.taxNumber || "");
      if (d.data.dealerId) {
        setPaymentDealerId(d.data.dealerId);
        fetch("/api/dealer/profile").then((r) => r.json()).then((p) => {
          if (p.success) {
            setDealer(p.data);
            const billingAddress = String(p.data.billingAddress || "").trim();
            const shippingAddress = String(p.data.shippingAddress || "").trim();
            if (billingAddress) setInvoiceAddress((current) => current || billingAddress);
            if (shippingAddress) setDeliveryAddress((current) => current || shippingAddress);
            if (billingAddress && shippingAddress) {
              setSameAddress(billingAddress === shippingAddress);
            } else if (billingAddress && !shippingAddress) {
              setSameAddress(true);
            }
            setCompany((current) => current || p.data.company || d.data.company || "");
            setTaxId((current) => current || p.data.taxNumber || d.data.taxNumber || "");
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
  const dealerCreditLimit = dealer?.creditLimit || 0;
  const dealerOpeningBalance = dealer?.openingBalance || 0;
  const dealerCreditEnabled = Boolean(dealer && (dealerCreditLimit > 0 || dealer.allowNegative));
  const dealerCreditCapacity = dealerCreditLimit + dealerOpeningBalance;
  const dealerCreditExceeded = dealerCreditEnabled && !dealer?.allowNegative && dealerCreditLimit > 0 && total > dealerCreditCapacity;
  const dealerAddressesReady = Boolean(invoiceAddress.trim() && (sameAddress ? invoiceAddress.trim() : deliveryAddress.trim()));
  const shouldPersistDealerAddresses = Boolean(
    isDealer &&
      dealerAddressesReady &&
      (
        invoiceAddress.trim() !== String(dealer?.billingAddress || "").trim() ||
        (sameAddress ? invoiceAddress.trim() : deliveryAddress.trim()) !== String(dealer?.shippingAddress || "").trim() ||
        taxId.trim() !== String(dealer?.taxNumber || "").trim()
      )
  );

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

  const persistDealerDetails = async () => {
    if (!isDealer || !shouldPersistDealerAddresses) return true;
    setAddressSyncing(true);
    try {
      const res = await fetch("/api/dealer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingAddress: invoiceAddress.trim(),
          shippingAddress: sameAddress ? invoiceAddress.trim() : deliveryAddress.trim(),
          taxNumber: taxId.trim(),
        }),
      });
      if (!res.ok) {
        setError("Adresler profilinize kaydedilemedi. Lütfen tekrar deneyin.");
        return false;
      }
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setDealer((current) => current ? ({
          ...current,
          billingAddress: invoiceAddress.trim(),
          shippingAddress: sameAddress ? invoiceAddress.trim() : deliveryAddress.trim(),
          taxNumber: taxId.trim(),
        }) : current);
        return true;
      }
      setError("Adresler profilinize kaydedilemedi. Lütfen tekrar deneyin.");
      return false;
    } finally {
      setAddressSyncing(false);
    }
  };

  const submitOrder = async (paymentMethod?: string, installmentCount = 1) => {
    setSubmitting(true);
    setError("");

    try {
      if (!platform) { setError("Lütfen bir platform seçin"); return false; }
      const addrToCheck = sameAddress ? invoiceAddress : deliveryAddress;
      if (!invoiceAddress.trim() || !addrToCheck.trim()) { setError("Adres bilgilerini doldurun"); return false; }
      if (canUseDealerPayment && !paymentMethod) {
        setError("Bayi siparişi için lütfen bir ödeme yöntemi seçin.");
        return false;
      }

      if (minOrderAmount > 0 && total < minOrderAmount) {
        setError(`Minimum sipariş tutarı ${formatPrice(minOrderAmount)}. Şu anki tutar: ${formatPrice(total)}`);
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
        return false;
      }

      if (isDealer && shouldPersistDealerAddresses) {
        const persisted = await persistDealerDetails();
        if (!persisted) return false;
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
        try {
          const parsed = JSON.parse(stored) as { id?: string; discount?: number };
          if (parsed?.id) body.couponId = parsed.id;
          if (typeof parsed?.discount === "number") body.discount = parsed.discount;
        } catch {
          window.sessionStorage.removeItem("couponData");
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw = await res.text();
      let data: any = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { error: raw };
        }
      }

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
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı");
      return false;
    } finally {
      setSubmitting(false);
    }
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-ena-primary/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-[10rem] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[28px] border border-ena-border bg-ena-card/55 p-6 md:p-8 mb-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-5">
              <ChevronLeft size={16} /> Alışverişe Devam Et
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-ena-primary/20 bg-ena-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ena-primary">
                <Sparkles size={12} /> B4B Sipariş
              </span>
              {selectedPlatform && (
                <span className="inline-flex items-center gap-1 rounded-full border border-ena-border bg-black/20 px-3 py-1 text-xs text-ena-light">
                  {selectedPlatform.label}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-ena-text leading-[0.95]">
              Sipariş Onayı
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-ena-light/80 leading-relaxed">
              Adresler profilinden gelir. Eksikse ilk siparişte kaydederiz. Ödeme yöntemi, platform ve belge ekleri aynı ekranda ilerler.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Adres</p>
              <p className="mt-1 text-sm font-semibold text-ena-text">
                {isDealer ? (dealer?.billingAddress ? "Profilden çekildi" : "İlk siparişte kaydedilecek") : "Manuel giriş"}
              </p>
            </div>
            <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Ödeme</p>
              <p className="mt-1 text-sm font-semibold text-ena-text">Seçip devam edin</p>
            </div>
            <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Akış</p>
              <p className="mt-1 text-sm font-semibold text-ena-text">Tek form, tek onay</p>
            </div>
          </div>
        </div>
      </motion.div>

      {isDealer && dealer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 rounded-[26px] border border-ena-border bg-ena-card/50 p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ena-light/50">
                <CreditCard size={14} /> Cari hesap
              </div>
              <h2 className="mt-2 text-lg md:text-xl font-bold text-ena-text">
                {dealerCreditEnabled ? "Kredi kullanımı hazır" : "Cari hesap bu hesapta kapalı"}
              </h2>
              <p className="mt-2 text-sm text-ena-light/75 max-w-2xl">
                {dealerCreditEnabled
                  ? "Bu kutu yalnızca cari hesapla sipariş verirken limit durumunu gösterir. Kart veya havale ile devam ediyorsanız bir engel değildir."
                  : "Kredi limiti tanımlı değil. Siparişi kart veya havale ile tamamlarsanız bu alan sizi etkilemez."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-[340px]">
              <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Kredi limiti</p>
                <p className="mt-1 text-base font-semibold text-ena-text">
                  {dealerCreditLimit > 0 ? formatPrice(dealerCreditLimit) : "Yok"}
                </p>
              </div>
              <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Bu sipariş</p>
                <p className="mt-1 text-base font-semibold text-ena-primary">{formatPrice(total)}</p>
              </div>
              <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Grup</p>
                <p className="mt-1 text-base font-semibold text-ena-text uppercase">{dealer.group}</p>
              </div>
              <div className="rounded-2xl border border-ena-border bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ena-light/50">Durum</p>
                <p className={`mt-1 text-base font-semibold ${dealerCreditExceeded ? "text-amber-400" : "text-emerald-400"}`}>
                  {dealerCreditExceeded ? "Limit aşılıyor" : dealerCreditEnabled ? "Uygun" : "Cari kapalı"}
                </p>
              </div>
            </div>
          </div>
          {dealerCreditExceeded && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Cari hesap limiti aşılacak.</p>
                <p className="text-amber-300/80">Bu sipariş için bakiye yerine havale veya kart seçmeniz daha doğru olur.</p>
              </div>
            </div>
          )}
          {minOrderAmount > 0 && (
            <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${total < minOrderAmount ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}`}>
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
        className="rounded-[26px] border border-ena-border bg-ena-card/50 p-6 mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-ena-text">Sipariş Özeti</h2>
          <span className="text-xs text-ena-light/50">{items.length} satır</span>
        </div>
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
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-sm">
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
        <div className="rounded-[26px] border border-ena-border bg-ena-card/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
          <select value={platform} onChange={e => { setPlatform(e.target.value); setShippingCost(PLATFORMS.find(p => p.value === e.target.value)?.shipping || 0); }}
            className="w-full rounded-2xl border border-ena-border bg-ena-card/60 px-3 py-3 text-sm text-ena-text focus:outline-none focus:border-ena-primary">
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}{p.hasFree ? " (Ücretsiz Kargo)" : p.shipping > 0 ? ` (Kargo: ${formatPrice(p.shipping)})` : ""}</option>)}
          </select>
          {platform && (
            <div className="mt-3 text-xs text-ena-light leading-relaxed bg-ena-dark/30 rounded-2xl p-3">
              {isOwnSite ? (
                <span>Kendi sitenizden gelen siparişlerde <strong className="text-ena-text">kargo ücreti {formatPrice(effectiveShipping)}</strong> sepete yansıtılır. Fatura ve teslimat adreslerini ayrı ayrı girebilirsiniz.</span>
              ) : (
                <span>Pazaryeri siparişlerinde <strong className="text-ena-text">kargo ücretsizdir</strong>. Fatura adresi bayi adresiniz, teslimat adresi ise kargo şablonundaki adrestir.</span>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[26px] border border-ena-border bg-ena-card/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck size={16} className="text-emerald-400" />
              <h2 className="font-bold text-ena-text">Firma Bilgileri</h2>
            </div>
            <div className="space-y-4">
              <Input id="company" label="Firma Adı" placeholder="Firma adınız" value={company} onChange={(e) => setCompany(e.target.value)} required />
              <Input id="taxId" label="Vergi Numarası" placeholder="VKN / TCKN" value={taxId} onChange={(e) => setTaxId(e.target.value)} required />
            </div>
          </div>

          <div className="rounded-[26px] border border-ena-border bg-ena-card/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <MapPinned size={16} className="text-ena-primary" />
                <h2 className="font-bold text-ena-text">Adres Defteri</h2>
              </div>
              {isDealer && (
                <Link href="/dealer/profile#addresses" className="text-xs text-ena-light hover:text-ena-text inline-flex items-center gap-1">
                  Profilden düzenle <ArrowRight size={12} />
                </Link>
              )}
            </div>
            {isDealer && (
              <div className="mb-4 rounded-2xl border border-ena-border bg-black/20 p-3 text-xs text-ena-light/75">
                {dealer?.billingAddress || dealer?.shippingAddress ? (
                  <span>Adresler profilinden çekildi. Burada yaptığın değişiklikler ilk onayda profile yazılır.</span>
                ) : (
                  <span>Profilde kayıt yok. İlk siparişte adresleri kaydedeceğiz, sonra hep buradan otomatik gelecek.</span>
                )}
              </div>
            )}
            <div className="space-y-4">
              <Input id="invoiceAddress" label="Fatura Adresi" placeholder="Mahalle, Sokak, Apartman, Daire, Şehir..." value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} required />

              <div className="flex items-center gap-2">
                <input type="checkbox" id="sameAddress" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} className="rounded border-ena-border bg-ena-card/60" />
                <label htmlFor="sameAddress" className="text-sm text-ena-light">Teslimat adresi fatura adresi ile aynı</label>
              </div>

              {!sameAddress && (
                <div>
                  <Input id="deliveryAddress" label="Teslimat Adresi" placeholder="Mahalle, Sokak, Apartman, Daire, Şehir..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
                  {isOwnSite && <p className="text-xs text-amber-400 mt-1">Kendi sitem siparişlerinde teslimat adresi fatura adresinden farklıysa mutlaka eksiksiz doldurulmalıdır.</p>}
                </div>
              )}

              {platform && !isOwnSite && (
                <div className="text-xs text-ena-light bg-ena-dark/30 rounded-2xl p-3 leading-relaxed border border-ena-border">
                  <strong className="text-ena-text">Pazaryeri siparişlerinde adres akışı</strong><br />
                  Fatura adresi olarak bayi adresiniz kullanılır. Teslimat ise pazaryeri kargo şablonundaki kayıtlı adrese göre ilerler.
                </div>
              )}
            </div>
          </div>
        </div>

        {isOwnSite && shippingCost > 0 && (
          <div className="flex justify-between text-sm text-ena-light border-t border-ena-border pt-2">
            <span>Kargo Ücreti</span>
            <span className="font-bold text-ena-text">{formatPrice(effectiveShipping)}</span>
          </div>
        )}

        {/* Dosya Ekleme */}
        <div className="rounded-[26px] border border-dashed border-ena-border p-4 space-y-3 bg-ena-card/30">
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
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ena-card/50 border border-ena-border text-sm text-ena-light hover:text-ena-text hover:border-ena-text/30 cursor-pointer transition-colors">
            <Paperclip size={14} /> {uploading ? "Yükleniyor..." : "Dosya Seç (PDF, JPG, PNG)"}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {!showGatewayPaymentPanel && !isDealer && (
          <Button type="submit" className="w-full" disabled={submitting || addressSyncing || items.length === 0}>
            {submitting || addressSyncing ? "Sipariş oluşturuluyor..." : "Siparişi Tamamla"}
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
            loading={submitting || addressSyncing}
            dealerId={paymentDealerId || undefined}
            onConfirm={handleOnlinePayment}
          />
        </div>
      )}
    </div>
  );
}
