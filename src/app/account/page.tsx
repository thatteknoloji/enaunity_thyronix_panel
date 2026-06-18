"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, User } from "@/types";
import {
  Package, Building2, Download, FileText, MapPin, Upload, Plus, Pencil, Trash2,
  Check, X, Eye, AlertCircle, FileSignature, Search, Filter, Home, User as UserIcon, Heart, Star,
  RotateCcw, ReceiptText, Wallet, TrendingUp, Clock, ShoppingCart, Bell, CreditCard, Save,
  Gift, Tag, ChevronRight, Store, MessageCircle, Zap, Power, PowerOff, LogOut, Key, Webhook
} from "lucide-react";
import toast from "react-hot-toast";
import { useAccountCenter } from "@/components/account/AccountCenterProvider";
import { AccCard, AccEmpty, AccPageTitle, AccSkeleton, AccStatCard, AccTableWrap } from "@/components/account/AccountShell";
import { PremiumModuleCard, OnboardingProgress } from "@/components/account/PremiumModuleCard";
import type { AccountTab } from "@/components/account/nav";
import { ORDER_STATUS_MAP, DOC_TYPE_LABELS } from "@/components/account/nav";
import type { CustomerProductsOverview } from "@/lib/customer-products/types";

type Tab = AccountTab;

const ov: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning", pending_approval: "warning", approved: "default",
  shipped: "default", delivered: "success", cancelled: "danger",
};

const st = ORDER_STATUS_MAP;
const tl = DOC_TYPE_LABELS;

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function AccountPage() {
  const router = useRouter();
  const { user, tab, setTab, setLogo } = useAccountCenter();
  const [loading, setLoading] = useState(true);

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("");

  const [contracts, setContracts] = useState<any[]>([]);
  const [contractsL, setContractsL] = useState(false);
  const [vContract, setVContract] = useState<any>(null);
  const [cFilter, setCFilter] = useState("");

  const [addresses, setAddresses] = useState<any[]>([]);
  const [addrL, setAddrL] = useState(false);
  const [sAddrF, setSAddrF] = useState(false);
  const [eAddr, setEAddr] = useState<string | null>(null);
  const [aForm, setAForm] = useState({ label: "", type: "shipping", fullAddress: "", city: "", district: "", zipCode: "", phone: "", isDefault: false });
  const [aSav, setASav] = useState(false);

  const [docs, setDocs] = useState<any[]>([]);
  const [docsL, setDocsL] = useState(false);
  const [upl, setUpl] = useState(false);
  const [dTit, setDTit] = useState("");
  const [dTyp, setDTyp] = useState("other");
  const fRef = useRef<HTMLInputElement>(null);

  const [dash, setDash] = useState<any>(null);
  const [dashL, setDashL] = useState(false);
  const [customerProducts, setCustomerProducts] = useState<CustomerProductsOverview | null>(null);
  const [approvalInfo, setApprovalInfo] = useState<any>(null);

  const [profile, setProfile] = useState<any>(null);
  const [profL, setProfL] = useState(false);
  const [pForm, setPForm] = useState({ phone: "", website: "", location: "", taxNumber: "", taxOffice: "", billingAddress: "", shippingAddress: "", logo: "" });
  const [pSav, setPSav] = useState(false);
  const [logoUp, setLogoUp] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishL, setWishL] = useState(false);

  const [returns, setReturns] = useState<any[]>([]);
  const [retL, setRetL] = useState(false);

  const [quotes, setQuotes] = useState<any[]>([]);
  const [qL, setQL] = useState(false);

  const [billing, setBilling] = useState<any>(null);
  const [billL, setBillL] = useState(false);

  const [activeTabLoaded, setActiveTabLoaded] = useState<Set<Tab>>(new Set());

  const loadTab = useCallback(async (t: Tab) => {
    if (activeTabLoaded.has(t)) return;
    setActiveTabLoaded(prev => new Set(prev).add(t));

    switch (t) {
      case "overview":
        setDashL(true);
        Promise.all([
          fetch("/api/dealer/dashboard").then(r => r.json()),
          fetch("/api/customer-products").then(r => r.json()),
          fetch("/api/customer-products/licenses").then(r => r.json()).catch(() => null),
        ]).then(([dashRes, productsRes, licenseRes]) => {
          if (dashRes.success) setDash(dashRes.data);
          if (productsRes.success) setCustomerProducts(productsRes.data);
          if (licenseRes?.success) setApprovalInfo(licenseRes.data?.approval);
        }).finally(() => setDashL(false));
        break;
      case "contracts":
        setContractsL(true);
        fetch("/api/dealer/contracts").then(r => r.json()).then(d => { if (d.success) setContracts(d.data); }).finally(() => setContractsL(false));
        break;
      case "addresses":
        setAddrL(true);
        fetch("/api/dealer/addresses").then(r => r.json()).then(d => { if (d.success) setAddresses(d.data); }).finally(() => setAddrL(false));
        break;
      case "documents":
        setDocsL(true);
        Promise.all([
          fetch("/api/dealer/documents").then(r => r.json()),
          fetch("/api/customer-products/licenses").then(r => r.json()).catch(() => null),
        ]).then(([docsRes, licenseRes]) => {
          if (docsRes.success) setDocs(docsRes.data);
          if (licenseRes?.success) setApprovalInfo(licenseRes.data?.approval);
        }).finally(() => setDocsL(false));
        break;
      case "profile":
        setProfL(true);
        fetch("/api/dealer/profile").then(r => r.json()).then(d => {
          if (d.success) {
            setProfile(d.data);
            setPForm({
              phone: d.data.phone || "", website: d.data.website || "", location: d.data.location || "",
              taxNumber: d.data.taxNumber || "", taxOffice: d.data.taxOffice || "",
              billingAddress: d.data.billingAddress || "", shippingAddress: d.data.shippingAddress || "",
              logo: d.data.logo || "",
            });
          }
        }).finally(() => setProfL(false));
        break;
      case "wishlist":
        setWishL(true);
        fetch("/api/dealer/wishlist").then(r => r.json()).then(d => { if (d.success) setWishlist(d.data); }).finally(() => setWishL(false));
        break;
      case "returns":
        setRetL(true);
        fetch("/api/dealer/returns").then(r => r.json()).then(d => { if (d.success) setReturns(d.data); }).finally(() => setRetL(false));
        break;
      case "quotes":
        setQL(true);
        fetch("/api/dealer/quotes").then(r => r.json()).then(d => { if (d.success) setQuotes(d.data); }).finally(() => setQL(false));
        break;
      case "billing":
        setBillL(true);
        fetch("/api/dealer/balance").then(r => r.json()).then(d => { if (d.success) setBilling(d.data); }).finally(() => setBillL(false));
        break;
    }
  }, [activeTabLoaded]);

  useEffect(() => {
    fetch("/api/orders").then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); });
  }, []);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const handleLogout = async () => { await fetch("/api/auth/login", { method: "DELETE" }); router.push("/"); router.refresh(); };

  const dloadInv = async (order: any) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const m = 20; let y = 20;
      doc.setFontSize(16); doc.setTextColor(229, 9, 20); doc.text("ENAUNITY", m, y);
      doc.setFontSize(8); doc.setTextColor(128);
      doc.text(`Fatura No: INV-${order.id.slice(0, 8).toUpperCase()}`, m, y += 5);
      doc.text(`Tarih: ${new Date(order.createdAt).toLocaleDateString("tr-TR")}`, m, y += 5); y += 8;
      doc.setFontSize(12); doc.setTextColor(0); doc.text("FATURA", m, y); y += 8;
      doc.setFontSize(10); doc.setTextColor(80);
      doc.text(`Durum: ${st[order.status] || order.status}`, m, y); y += 7;
      doc.text(`Adres: ${order.address || "-"}`, m, y); y += 10;
      doc.setFillColor(245, 245, 245); doc.rect(m, y, 170, 8, "F");
      doc.setFontSize(9); doc.setTextColor(80);
      doc.text("Ürün", m + 2, y + 5.5); doc.text("Adet", m + 90, y + 5.5); doc.text("Birim Fiyat", m + 115, y + 5.5); doc.text("Tutar", m + 150, y + 5.5); y += 10;
      (order.items || []).forEach((item: any) => {
        doc.text(item.product?.name || "", m + 2, y + 5.5); doc.text(String(item.quantity), m + 90, y + 5.5);
        doc.text(`${item.price.toFixed(2)} ₺`, m + 115, y + 5.5); doc.text(`${(item.price * item.quantity).toFixed(2)} ₺`, m + 150, y + 5.5); y += 7;
      });
      y += 3; doc.setDrawColor(200); doc.line(m, y, 190, y); y += 6;
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text(`Toplam: ${order.total.toFixed(2)} ₺`, m + 110, y);
      if (order.discount > 0) { y += 6; doc.setFontSize(9); doc.setTextColor(16, 185, 129); doc.text(`İndirim: -${order.discount.toFixed(2)} ₺`, m + 110, y); }
      y += 15; doc.setFontSize(7); doc.setTextColor(180); doc.text("Bu belge elektronik olarak oluşturulmuştur.", m, y);
      doc.save(`INV-${order.id.slice(0, 8).toUpperCase()}.pdf`);
      toast.success("Fatura indirildi");
    } catch { toast.error("PDF oluşturulamadı"); }
  };

  const conResp = async (id: string, status: string) => {
    const note = status === "rejected" ? prompt("Reddetme sebebi girin:") : "";
    if (status === "rejected" && note === null) return;
    const r = await fetch(`/api/dealer/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note: note || "" }) });
    const d = await r.json();
    if (d.success) { toast.success(status === "approved" ? "Onaylandı" : "Reddedildi"); setContracts((p) => p.map((c) => c.id === id ? { ...c, status, respondedAt: new Date().toISOString() } : c)); setVContract(null); }
    else toast.error("Hata");
  };

  const aRes = () => { setAForm({ label: "", type: "shipping", fullAddress: "", city: "", district: "", zipCode: "", phone: "", isDefault: false }); setEAddr(null); setSAddrF(false); };
  const aEdit = (a: any) => { setAForm({ label: a.label, type: a.type, fullAddress: a.fullAddress, city: a.city, district: a.district, zipCode: a.zipCode, phone: a.phone, isDefault: a.isDefault }); setEAddr(a.id); setSAddrF(true); };

  const aSave = async () => {
    if (!aForm.fullAddress.trim() || !aForm.city.trim()) return toast.error("Adres ve şehir gerekli");
    setASav(true);
    const url = eAddr ? `/api/dealer/addresses/${eAddr}` : "/api/dealer/addresses";
    const method = eAddr ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(aForm) });
    const d = await r.json();
    if (d.success) { toast.success(eAddr ? "Güncellendi" : "Eklendi"); setAddresses((p) => eAddr ? p.map((a) => a.id === eAddr ? { ...a, ...d.data } : a) : [d.data, ...p]); aRes(); }
    else toast.error(d.error || "Hata");
    setASav(false);
  };

  const aDel = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const r = await fetch(`/api/dealer/addresses/${id}`, { method: "DELETE" });
    if (r.ok) { setAddresses((p) => p.filter((a) => a.id !== id)); toast.success("Silindi"); }
  };

  const aDef = async (a: any) => {
    if (a.isDefault) return;
    const r = await fetch(`/api/dealer/addresses/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) });
    if (r.ok) { setAddresses((p) => p.map((adr) => ({ ...adr, isDefault: adr.id === a.id }))); toast.success("Varsayılan adres değiştirildi"); }
  };

  const hUp = async () => {
    const f = fRef.current?.files?.[0];
    if (!f) return toast.error("Dosya seçin");
    setUpl(true);
    const fd = new FormData(); fd.append("file", f); fd.append("title", dTit); fd.append("type", dTyp);
    const r = await fetch("/api/dealer/documents", { method: "POST", body: fd });
    const d = await r.json();
    if (d.success) { toast.success("Yüklendi"); setDocs((p) => [d.data, ...p]); setDTit(""); setDTyp("other"); if (fRef.current) fRef.current.value = ""; }
    else toast.error(d.error || "Hata");
    setUpl(false);
  };

  const fS = (b: number) => { if (b < 1024) return `${b} B`; if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`; return `${(b / (1024 * 1024)).toFixed(1)} MB`; };

  const saveProfile = async () => {
    setPSav(true);
    const r = await fetch("/api/dealer/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pForm) });
    const d = await r.json();
    if (d.success) toast.success("Profil güncellendi");
    else toast.error(d.error || "Hata");
    setPSav(false);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo 2MB'dan küçük olmalı"); return; }
    setLogoUp(true);
    const fd = new FormData();
    fd.append("files", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success && d.data?.length) {
        setPForm(prev => ({ ...prev, logo: d.data[0].fileUrl }));
        setLogo(d.data[0].fileUrl);
        toast.success("Logo yüklendi");
      } else { toast.error("Yükleme başarısız"); }
    } catch { toast.error("Hata"); }
    setLogoUp(false);
    if (logoRef.current) logoRef.current.value = "";
  };

  const addToCart = async (productId: string) => {
    const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) });
    if (r.ok) toast.success("Sepete eklendi");
  };

  const removeWish = async (productId: string) => {
    const r = await fetch(`/api/dealer/wishlist/${productId}`, { method: "DELETE" });
    if (r.ok) { setWishlist((p) => p.filter((w) => w.productId !== productId)); toast.success("Favorilerden çıkarıldı"); }
  };

  if (loading) return <AccSkeleton rows={4} />;

  const ordF = orders.filter((o) => {
    const ms = orderSearch === "" || o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.items.some((i) => i.product.name.toLowerCase().includes(orderSearch.toLowerCase()));
    const mf = orderFilter === "" || o.status === orderFilter;
    return ms && mf;
  });

  const cFilt = contracts.filter((c) => cFilter === "" || c.status === cFilter);

  const size = (n: number) => (n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toString());

  return (
    <>
      {tab === "overview" && (
        dashL ? <AccSkeleton rows={4} /> : !dash ? (
          <AccEmpty icon={Home} title="Veri yüklenemedi" description="Genel bakış bilgileri alınamadı." />
        ) : (
          <div className="space-y-6">
            {/* Hero */}
            <AccCard className="p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-ena-primary/8 via-transparent to-transparent pointer-events-none" />
              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-ena-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ena-light">Bayi Hesabı</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-ena-text">{dash.dealer?.company || dash.dealer?.name || user?.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="acc-badge-info text-[11px] px-2.5 py-1 rounded-full font-medium">
                      {dash.dealer?.status === "active" ? "Aktif Bayi" : "Pasif"}
                    </span>
                    {customerProducts?.products?.find(p => p.moduleKey === "ENA_COMMERCE") && (() => {
                      const ena = customerProducts.products.find(p => p.moduleKey === "ENA_COMMERCE");
                      const cls = ena?.status === "ACTIVE" ? "acc-badge-success" : ena?.status === "PENDING" ? "acc-badge-warning" : "acc-badge-neutral";
                      return (
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${cls}`}>
                          ENA {ena?.status}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-ena-border bg-ena-dark/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-ena-light">Cari Bakiye</p>
                    <p className={`text-xl font-bold mt-1 tabular-nums ${(dash.dealer.balance || 0) >= 0 ? "text-nexa-success" : "text-ena-primary"}`}>{fmt(dash.dealer.balance || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-ena-border bg-ena-dark/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-ena-light">Kredi Limiti</p>
                    <p className="text-xl font-bold text-ena-text mt-1 tabular-nums">{fmt(dash.dealer.creditLimit || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-ena-border bg-ena-dark/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-ena-light">Kullanılabilir Limit</p>
                    <p className="text-lg font-bold text-ena-text mt-1 tabular-nums">{fmt((dash.dealer.creditLimit || 0) - Math.abs(dash.dealer.balance || 0))}</p>
                  </div>
                  <div className="rounded-xl border border-ena-border bg-ena-dark/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-ena-light">Son Ödeme</p>
                    <p className="text-sm font-semibold text-ena-text mt-1">
                      {(() => {
                        const pay = (dash.recentTransactions || []).find((t: any) => t.type === "payment");
                        return pay ? `${fmt(pay.amount)} · ${new Date(pay.createdAt).toLocaleDateString("tr-TR")}` : "—";
                      })()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ena-border bg-ena-dark/30 p-4 col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-ena-light">Lisans Durumu</p>
                    <p className="text-sm font-semibold text-ena-text mt-1">
                      {customerProducts?.products?.filter((p: any) => p.moduleKey !== "ENA_COMMERCE").map((p: any) => `${p.label}: ${p.status}`).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </AccCard>

            <OnboardingProgress approval={approvalInfo} />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AccStatCard label="Bekleyen Onay" value={dash.stats.pendingApprovals} icon={Clock} accent="warning" />
              <AccStatCard label="Açık Teklif" value={dash.stats.pendingQuotes} icon={FileText} accent="info" />
              <AccStatCard
                label="Evrak Durumu"
                value={approvalInfo?.documentStatus === "APPROVED" ? "Onaylı" : approvalInfo?.documentStatus === "REJECTED" ? "Red" : "Bekliyor"}
                icon={FileText}
                accent={approvalInfo?.documentStatus === "APPROVED" ? "success" : "warning"}
              />
              <AccStatCard label="Bildirim" value={dash.stats.unreadNotifications} icon={Bell} accent="primary" />
            </div>

            {/* Premium modules */}
            {customerProducts && (
              <div>
                <AccPageTitle title="Premium Ürünler" description="THYRONIX ve HIVE modül durumları" />
                <div className="grid md:grid-cols-2 gap-4">
                  {customerProducts.products.filter(p => p.moduleKey !== "ENA_COMMERCE").map((p) => (
                    <PremiumModuleCard key={p.moduleKey} product={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            <AccCard>
              <h3 className="text-sm font-semibold text-ena-text mb-4">Sipariş Trendi</h3>
              <div className="flex items-end gap-2 h-36">
                {(dash.charts?.monthlyData || []).map((v: number, i: number) => {
                  const max = Math.max(...(dash.charts?.monthlyData || [1]), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-ena-light opacity-0 group-hover:opacity-100 transition-opacity">{size(v)}</span>
                      <div className="w-full rounded-t bg-ena-primary/50 group-hover:bg-ena-primary transition-colors" style={{ height: `${Math.max((v / max) * 100, 4)}%` }} />
                      <span className="text-[10px] text-ena-light">{(dash.charts?.monthLabels || [])[i] || ""}</span>
                    </div>
                  );
                })}
              </div>
            </AccCard>

            {/* Finance summary */}
            <AccCard>
              <h3 className="text-sm font-semibold text-ena-text mb-3">Finans Özeti</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-ena-light text-xs">Bakiye</p><p className="font-semibold text-ena-text mt-0.5">{fmt(dash.dealer.balance || 0)}</p></div>
                <div><p className="text-ena-light text-xs">Kullanılabilir</p><p className="font-semibold text-ena-text mt-0.5">{fmt((dash.dealer.creditLimit || 0) - Math.abs(dash.dealer.balance || 0))}</p></div>
                <div><p className="text-ena-light text-xs">Bu Ay</p><p className="font-semibold text-ena-text mt-0.5">{fmt(dash.stats.thisMonthTotal)}</p></div>
              </div>
            </AccCard>

            {/* Recent orders */}
            <div>
              <AccPageTitle title="Son Siparişler" action={<Button variant="ghost" size="sm" onClick={() => setTab("orders")}>Tümü</Button>} />
              <div className="space-y-2">
                {(dash.recentOrders || []).slice(0, 5).map((o: any) => (
                  <div key={o.id} className="acc-card-interactive px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ena-text">#{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-ena-light truncate max-w-xs">{o.items.map((i: any) => i.name).join(", ")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-ena-text">{fmt(o.total)}</p>
                      <Badge variant={ov[o.status] || "default"}>{st[o.status] || o.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(dash.notifications || []).length > 0 && (
              <div>
                <AccPageTitle title="Son Bildirimler" action={<Button variant="ghost" size="sm" onClick={() => setTab("notifications")}>Tümü</Button>} />
                <div className="space-y-2">
                  {(dash.notifications || []).slice(0, 4).map((n: any) => (
                    <div key={n.id} className="acc-card-interactive px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ena-text truncate">{n.title}</p>
                        <p className="text-xs text-ena-light truncate">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-ena-light shrink-0">{new Date(n.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(dash.recentTransactions || []).length > 0 && (
              <div>
                <AccPageTitle title="Son İşlemler" />
                <div className="space-y-1">
                  {(dash.recentTransactions || []).slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="acc-card px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                          t.type === "payment" ? "acc-badge-success" : t.type === "invoice" ? "acc-badge-info" : "acc-badge-warning"
                        }`}>{t.type}</span>
                        <span className="text-xs text-ena-light">{t.note || ""}</span>
                      </div>
                      <span className="text-sm font-medium text-ena-text tabular-nums">{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <AccPageTitle title="Güvenlik Ayarları" description="Hesap güvenliği ve oturum yönetimi" />
          <AccCard>
            <h3 className="text-sm font-semibold text-ena-text mb-2">Oturum</h3>
            <p className="text-sm text-ena-light">Aktif oturumunuz bu cihazda devam ediyor. Şüpheli aktivite fark ederseniz çıkış yapın ve şifrenizi güncelleyin.</p>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut size={14} className="mr-1" /> Tüm Oturumları Kapat</Button>
          </AccCard>
          <AccCard>
            <h3 className="text-sm font-semibold text-ena-text mb-2">Hesap Durumu</h3>
            <p className="text-sm text-ena-light">E-posta: <span className="text-ena-text font-medium">{user?.email}</span></p>
            <p className="text-sm text-ena-light mt-1">Rol: <span className="text-ena-text font-medium">{user?.role}</span></p>
          </AccCard>
        </div>
      )}

      {/* ===== ORDERS ===== */}
      {tab === "orders" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ena-light/40" />
              <input placeholder="Sipariş veya ürün ara..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-full rounded-lg border border-ena-border py-2 pl-9 pr-3 text-sm focus:border-ena-border focus:outline-none bg-transparent text-ena-text" />
            </div>
            <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="rounded-lg border border-ena-border py-2 px-3 text-sm bg-transparent text-ena-text">
              <option value="">Tümü</option>
              <option value="pending">Hazırlanıyor</option><option value="pending_approval">Onay Bekliyor</option>
              <option value="approved">Onaylandı</option><option value="shipped">Kargoda</option>
              <option value="delivered">Teslim Edildi</option><option value="cancelled">İptal</option>
            </select>
          </div>
          {ordF.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ena-border rounded"><Package size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Sipariş yok</p><Link href="/catalog"><Button variant="outline" className="mt-4">Alışverişe Başla</Button></Link></div>
          ) : (
            <div className="space-y-3">
              {ordF.map((order) => (
                <div key={order.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div><p className="text-sm text-ena-light">Sipariş #{order.id.slice(0, 8)}</p><p className="text-xs text-ena-light/50 mt-0.5">{formatDate(order.createdAt)}</p></div>
                    <Badge variant={ov[order.status] || "default"}>{st[order.status] || order.status}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <img src={item.product.image} alt={item.product.name} className="h-9 w-9 rounded object-cover" />
                        <span className="flex-1 text-ena-text">{item.product.name} x{item.quantity}</span>
                        <span className="text-ena-primary font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-ena-border flex justify-between items-center">
                    <span className="text-xs text-ena-light/40 truncate max-w-xs">{order.address}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => dloadInv(order)} className="text-xs text-ena-light hover:text-ena-primary flex items-center gap-1"><Download size={12} /> Fatura</button>
                      <span className="font-bold text-ena-text">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CONTRACTS ===== */}
      {tab === "contracts" && (
        <div>
          <select value={cFilter} onChange={(e) => setCFilter(e.target.value)} className="rounded-lg border border-ena-border py-2 px-3 text-sm bg-transparent text-ena-text mb-4">
            <option value="">Tümü</option><option value="pending">Onay Bekleyen</option><option value="approved">Onaylı</option><option value="rejected">Reddedilen</option>
          </select>
          {contractsL ? <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div> : cFilt.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ena-border rounded"><FileSignature size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Sözleşme yok</p></div>
          ) : (
            <div className="space-y-3">
              {cFilt.map((dc: any) => (
                <div key={dc.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3"><FileSignature size={18} className="text-ena-light/40" /><span className="font-medium text-ena-text">{dc.contract.title}</span></div>
                    <Badge variant={dc.status === "pending" ? "warning" : dc.status === "approved" ? "success" : "danger"}>{dc.status === "pending" ? "Onay Bekliyor" : dc.status === "approved" ? "Onaylı" : "Reddedildi"}</Badge>
                  </div>
                  <p className="text-xs text-ena-light/40 mb-3">{new Date(dc.createdAt).toLocaleDateString("tr-TR")}</p>
                  {dc.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-nexa-success/30 text-nexa-success hover:bg-nexa-success/10" onClick={() => conResp(dc.id, "approved")}><Check size={14} className="mr-1" /> Onayla</Button>
                      <Button size="sm" variant="outline" className="border-ena-primary/30 text-ena-primary hover:bg-ena-primary/50/10" onClick={() => conResp(dc.id, "rejected")}><X size={14} className="mr-1" /> Reddet</Button>
                      <Button size="sm" variant="ghost" onClick={() => setVContract(dc)}><Eye size={14} className="mr-1" /> İncele</Button>
                    </div>
                  )}
                  {dc.status !== "pending" && dc.note && <p className="text-xs text-ena-light/50 mt-2">{dc.status === "rejected" ? "Red sebebi:" : "Not:"} {dc.note}</p>}
                </div>
              ))}
            </div>
          )}
          {vContract && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ena-dark/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-ena-dark border border-ena-border p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-ena-text">{vContract.contract.title}</h2><button onClick={() => setVContract(null)} className="text-ena-light/50 hover:text-ena-text text-xl">&times;</button></div>
                <div className="prose prose-invert prose-sm max-w-none text-ena-text" dangerouslySetInnerHTML={{ __html: vContract.contract.content }} />
                {vContract.status === "pending" && <div className="flex gap-2 mt-6 pt-4 border-t border-ena-border"><Button size="sm" onClick={() => conResp(vContract.id, "approved")}><Check size={14} className="mr-1" /> Onayla</Button><Button size="sm" variant="outline" onClick={() => conResp(vContract.id, "rejected")}><X size={14} className="mr-1" /> Reddet</Button></div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADDRESSES ===== */}
      {tab === "addresses" && (
        <div>
          <div className="flex justify-end mb-4"><Button size="sm" onClick={() => { aRes(); setSAddrF(true); }}><Plus size={16} className="mr-1" /> Yeni Adres</Button></div>
          {sAddrF && (
            <div className="rounded-xl border border-ena-border bg-ena-card/30 p-4 mb-4">
              <h2 className="text-sm font-semibold text-ena-text mb-4">{eAddr ? "Düzenle" : "Yeni Adres"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Etiket</label><input className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.label} onChange={(e) => setAForm({ ...aForm, label: e.target.value })} placeholder="İş Adresim" /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Tür</label><select className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.type} onChange={(e) => setAForm({ ...aForm, type: e.target.value })}><option value="shipping">Teslimat</option><option value="billing">Fatura</option></select></div>
                <div className="md:col-span-2"><label className="block text-xs text-ena-light/40 uppercase mb-1">Adres</label><textarea className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" rows={2} value={aForm.fullAddress} onChange={(e) => setAForm({ ...aForm, fullAddress: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Şehir</label><input className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.city} onChange={(e) => setAForm({ ...aForm, city: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">İlçe</label><input className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.district} onChange={(e) => setAForm({ ...aForm, district: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Posta Kodu</label><input className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.zipCode} onChange={(e) => setAForm({ ...aForm, zipCode: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Telefon</label><input className="w-full rounded border border-ena-border bg-transparent px-3 py-2 text-sm text-ena-text focus:outline-none" value={aForm.phone} onChange={(e) => setAForm({ ...aForm, phone: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2 mb-4"><input type="checkbox" id="def" checked={aForm.isDefault} onChange={(e) => setAForm({ ...aForm, isDefault: e.target.checked })} /><label htmlFor="def" className="text-sm text-ena-text">Varsayılan yap</label></div>
              <div className="flex gap-2"><Button size="sm" onClick={aSave} disabled={aSav}>{aSav ? "..." : "Kaydet"}</Button><Button size="sm" variant="ghost" onClick={aRes}>İptal</Button></div>
            </div>
          )}
          {addrL ? <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div> : addresses.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ena-border rounded"><MapPin size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Adres yok</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.map((a: any) => (
                <div key={a.id} className={`rounded-xl border p-4 ${a.isDefault ? "border-ena-primary/40 bg-ena-primary/5" : "border-ena-border bg-ena-card/30"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2"><MapPin size={16} className="text-ena-light/40" /><span className="font-medium text-ena-text text-sm">{a.label || (a.type === "billing" ? "Fatura" : "Teslimat")}</span>{a.isDefault && <Star size={12} className="text-nexa-warning fill-yellow-500" />}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ena-light/10 text-ena-light/60 uppercase">{a.type === "billing" ? "Fatura" : "Teslimat"}</span>
                  </div>
                  <p className="text-sm text-ena-light/70">{a.fullAddress}</p>
                  <p className="text-xs text-ena-light/40">{a.city}{a.district ? ` / ${a.district}` : ""}{a.zipCode ? ` - ${a.zipCode}` : ""}</p>
                  {a.phone && <p className="text-xs text-ena-light/40 mt-0.5">{a.phone}</p>}
                  <div className="flex gap-1 mt-3 pt-3 border-t border-ena-border/50">
                    {!a.isDefault && <button onClick={() => aDef(a)} className="text-ena-light/50 hover:text-nexa-warning"><Star size={14} /></button>}
                    <button onClick={() => aEdit(a)} className="text-ena-light/50 hover:text-ena-text ml-auto"><Pencil size={14} /></button>
                    <button onClick={() => aDel(a.id)} className="text-ena-light/50 hover:text-ena-primary"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DOCUMENTS ===== */}
      {tab === "documents" && (
        <div className="space-y-6">
          <AccPageTitle title="Evraklar" description="Bayi onay süreci ve evrak yüklemeleri" />
          <OnboardingProgress approval={approvalInfo} />
          <AccCard>
            <h2 className="text-sm font-semibold text-ena-text mb-4">Yeni Evrak Yükle</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Evrak Adı</label><input className="acc-input" value={dTit} onChange={(e) => setDTit(e.target.value)} placeholder="Vergi Levhası" /></div>
              <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Tür</label><select className="acc-input" value={dTyp} onChange={(e) => setDTyp(e.target.value)}>{Object.entries(tl).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Dosya</label><input ref={fRef} type="file" className="acc-input file:mr-3 file:rounded file:border-0 file:bg-ena-primary/10 file:px-3 file:py-1.5 file:text-sm file:text-ena-primary" /></div>
            </div>
            <Button size="sm" onClick={hUp} disabled={upl}><Upload size={14} className="mr-1" /> {upl ? "Yükleniyor..." : "Yükle"}</Button>
          </AccCard>
          {docsL ? <AccSkeleton rows={3} /> : docs.length === 0 ? (
            <AccEmpty icon={Upload} title="Evrak yok" description="Onay sürecini tamamlamak için gerekli evrakları yükleyin." />
          ) : (
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <div key={doc.id} className="acc-card-interactive p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ena-primary/10 shrink-0"><FileText size={16} className="text-ena-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ena-text truncate">{doc.title}</p><p className="text-xs text-ena-light/40">{tl[doc.type] || doc.type} &middot; {fS(doc.fileSize)}</p>{doc.status === "rejected" && doc.adminNote && <p className="text-xs text-ena-primary mt-0.5"><AlertCircle size={10} className="inline mr-0.5" />{doc.adminNote}</p>}</div>
                  <Badge variant={doc.status === "pending" ? "warning" : doc.status === "approved" ? "success" : "danger"}>{doc.status === "pending" ? "Bekliyor" : doc.status === "approved" ? "Onaylandı" : "Reddedildi"}</Badge>
                  <a href={doc.fileUrl} target="_blank" className="text-ena-light/40 hover:text-ena-text"><Download size={15} /></a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PROFILE ===== */}
      {tab === "profile" && (
        profL ? <AccSkeleton rows={4} /> : !profile ? (
          <AccEmpty icon={UserIcon} title="Profil yüklenemedi" description="Bayi profil bilgileri alınamadı." />
        ) : (
          <div className="space-y-6">
            <AccPageTitle title="Profil" description="Kişisel, firma ve iletişim bilgileriniz" />

            <AccCard>
              <h2 className="text-sm font-semibold text-ena-text mb-4">Kişisel Bilgiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Yetkili</label><p className="text-sm text-ena-text">{profile.name || "—"}</p></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">E-posta</label><p className="text-sm text-ena-text">{profile.email || "—"}</p></div>
              </div>
            </AccCard>

            <AccCard>
              <h2 className="text-sm font-semibold text-ena-text mb-4">Firma Bilgileri</h2>
              <div className="flex items-center gap-4 mb-4">
                {pForm.logo ? (
                  <img src={pForm.logo} alt="Logo" className="w-20 h-20 rounded-xl object-cover border border-ena-border" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-ena-border flex items-center justify-center text-ena-light/30">
                    <Building2 size={28} />
                  </div>
                )}
                <div>
                  <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-input" />
                  <label htmlFor="logo-input" className="inline-flex items-center gap-1.5 text-xs bg-ena-card border border-ena-border text-ena-text px-3 py-2 rounded-lg cursor-pointer hover:bg-ena-card/70 transition-colors">
                    <Upload size={14} /> {logoUp ? "Yükleniyor..." : pForm.logo ? "Değiştir" : "Logo Yükle"}
                  </label>
                  {pForm.logo && (
                    <button onClick={() => setPForm(prev => ({ ...prev, logo: "" }))} className="ml-2 text-xs text-ena-light/40 hover:text-ena-primary transition-colors">
                      Kaldır
                    </button>
                  )}
                  <p className="text-[10px] text-ena-light/30 mt-1.5">PNG, JPG veya SVG. Max 2MB.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Firma Adı</label><p className="text-sm text-ena-text">{profile.company || "—"}</p></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Grup</label><p className="text-sm text-ena-text">{profile.dealerGroup?.name || profile.group || "—"}</p></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">İskonto Oranı</label><p className="text-sm text-ena-text">{profile.discountRate ? `%${profile.discountRate}` : "—"}</p></div>
              </div>
            </AccCard>

            <AccCard>
              <h2 className="text-sm font-semibold text-ena-text mb-4">Vergi Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Vergi No</label><input className="acc-input" value={pForm.taxNumber} onChange={(e) => setPForm({ ...pForm, taxNumber: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Vergi Dairesi</label><input className="acc-input" value={pForm.taxOffice} onChange={(e) => setPForm({ ...pForm, taxOffice: e.target.value })} /></div>
                <div className="md:col-span-2"><label className="block text-xs text-ena-light/40 uppercase mb-1">Fatura Adresi</label><textarea className="acc-input min-h-[72px]" rows={2} value={pForm.billingAddress} onChange={(e) => setPForm({ ...pForm, billingAddress: e.target.value })} /></div>
              </div>
            </AccCard>

            <AccCard>
              <h2 className="text-sm font-semibold text-ena-text mb-4">İletişim Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Telefon</label><input className="acc-input" value={pForm.phone} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Web Sitesi</label><input className="acc-input" value={pForm.website} onChange={(e) => setPForm({ ...pForm, website: e.target.value })} /></div>
                <div><label className="block text-xs text-ena-light/40 uppercase mb-1">Konum</label><input className="acc-input" value={pForm.location} onChange={(e) => setPForm({ ...pForm, location: e.target.value })} /></div>
                <div className="md:col-span-2"><label className="block text-xs text-ena-light/40 uppercase mb-1">Teslimat Adresi</label><textarea className="acc-input min-h-[72px]" rows={2} value={pForm.shippingAddress} onChange={(e) => setPForm({ ...pForm, shippingAddress: e.target.value })} /></div>
              </div>
              <Button size="sm" className="mt-4" onClick={saveProfile} disabled={pSav}><Save size={14} className="mr-1" /> {pSav ? "Kaydediliyor..." : "Profili Güncelle"}</Button>
            </AccCard>

            <AccCard>
              <h2 className="text-sm font-semibold text-ena-text mb-4">Hesap Durumu</h2>
              <div className="flex flex-wrap gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${profile.status === "active" ? "acc-badge-success" : "acc-badge-neutral"}`}>
                  {profile.status === "active" ? "Aktif Bayi" : "Pasif"}
                </span>
                {approvalInfo?.status && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium acc-badge-info">
                    Onay: {approvalInfo.status}
                  </span>
                )}
              </div>
            </AccCard>
          </div>
        )
      )}

      {/* ===== WISHLIST ===== */}
      {tab === "wishlist" && (
        wishL ? <div className="animate-pulse space-y-3"><div className="h-20 rounded bg-ena-card/50" /><div className="h-20 rounded bg-ena-card/50" /></div> : wishlist.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-ena-border rounded"><Heart size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Favori ürününüz yok</p><Link href="/catalog"><Button variant="outline" className="mt-4">Kataloğu İncele</Button></Link></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wishlist.map((w: any) => (
              <div key={w.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4">
                <img src={w.product.image} alt={w.product.name} className="h-28 w-full rounded-lg object-cover mb-3" />
                <p className="text-sm font-medium text-ena-text truncate">{w.product.name}</p>
                <p className="text-xs text-ena-light/40 mb-1">{w.product.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ena-primary">{formatPrice(w.product.price)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => addToCart(w.product.id)} className="text-xs px-2 py-1 rounded bg-ena-primary/10 text-ena-primary hover:bg-ena-primary/10">Sepete Ekle</button>
                    <button onClick={() => removeWish(w.product.id)} className="text-xs text-ena-light/40 hover:text-ena-primary"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ===== RETURNS ===== */}
      {tab === "returns" && (
        retL ? <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div> : returns.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-ena-border rounded"><RotateCcw size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">İade talebiniz yok</p></div>
        ) : (
          <div className="space-y-3">
            {returns.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw size={16} className="text-ena-light/40" />
                    <span className="text-sm font-medium text-ena-text">İade #{r.id.slice(0, 8)}</span>
                  </div>
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                    {r.status === "pending" ? "İncelemede" : r.status === "approved" ? "Onaylandı" : "Reddedildi"}
                  </Badge>
                </div>
                {r.reason && <p className="text-xs text-ena-light/60 mb-2">Sebep: {r.reason}</p>}
                <div className="space-y-1">
                  {(r.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.product?.image && <img src={item.product.image} className="h-7 w-7 rounded object-cover" />}
                      <span className="flex-1 text-ena-text text-xs">{item.product?.name}</span>
                      <span className="text-xs text-ena-light/50">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {r.adminNote && <p className="text-xs text-ena-light/50 mt-2">Not: {r.adminNote}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* ===== QUOTES ===== */}
      {tab === "quotes" && (
        qL ? <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div> : quotes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-ena-border rounded"><FileText size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Teklifiniz yok</p><Link href="/dealer/quotes"><Button variant="outline" className="mt-4">Teklif Oluştur</Button></Link></div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q: any) => (
              <div key={q.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div><span className="text-sm font-medium text-ena-text">Teklif #{q.id.slice(0, 8)}</span><p className="text-xs text-ena-light/40">{formatDate(q.createdAt)}</p></div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ena-text">{fmt(q.total)}</p>
                    <Badge variant={q.status === "approved" ? "success" : q.status === "rejected" ? "danger" : q.status === "pending" ? "warning" : "default"}>
                      {q.status === "pending" ? "Bekliyor" : q.status === "approved" ? "Onaylı" : q.status === "rejected" ? "Red" : q.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {(q.items || []).slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.product?.image && <img src={item.product.image} className="h-7 w-7 rounded object-cover" />}
                      <span className="flex-1 text-ena-text text-xs">{item.product?.name}</span>
                      <span className="text-xs text-ena-light/50">x{item.quantity}</span>
                      <span className="text-xs text-ena-text">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {(q.items || []).length > 3 && <p className="text-xs text-ena-light/40">+{q.items.length - 3} ürün daha</p>}
                </div>
                {q.note && <p className="text-xs text-ena-light/50 mt-2">Not: {q.note}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* ===== BILLING ===== */}
      {tab === "billing" && (
        billL ? <AccSkeleton rows={4} /> : !billing ? (
          <AccEmpty icon={Wallet} title="Veri yüklenemedi" description="Cari hesap bilgileri alınamadı." />
        ) : (
          <div className="space-y-6">
            <AccPageTitle title="Cari Hesap" description="Bakiye, limit, faturalar ve finans hareketleri" />

            <AccCard className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-ena-light uppercase">Cari Bakiye</p>
                  <p className={`text-2xl font-bold mt-1 ${billing.balance >= 0 ? "text-nexa-success" : "text-ena-primary"}`}>{fmt(billing.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-ena-light uppercase">Kredi Limiti</p>
                  <p className="text-2xl font-bold text-ena-text mt-1">{fmt(billing.creditLimit)}</p>
                </div>
                <div>
                  <p className="text-xs text-ena-light uppercase">Kullanılabilir Limit</p>
                  <p className={`text-2xl font-bold mt-1 ${(billing.creditLimit - Math.abs(billing.balance)) > 0 ? "text-nexa-success" : "text-ena-primary"}`}>{fmt(billing.creditLimit - Math.abs(billing.balance || 0))}</p>
                </div>
              </div>
            </AccCard>

            <div>
              <AccPageTitle title="Faturalar" />
              <AccTableWrap>
                <div className="divide-y divide-ena-border/50">
                  {orders.filter(o => o.status !== "cancelled").slice(0, 10).map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-ena-primary/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <ReceiptText size={16} className="text-ena-light shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-ena-text font-medium">INV-{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-ena-light">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={ov[order.status] || "default"}>{st[order.status] || order.status}</Badge>
                        <span className="text-sm font-medium text-ena-text tabular-nums">{fmt(order.total)}</span>
                        <button onClick={() => dloadInv(order)} className="text-ena-light hover:text-ena-text transition-colors"><Download size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccTableWrap>
            </div>

            <div>
              <AccPageTitle title="Finans Hareketleri" />
              {(billing.transactions || []).length === 0 ? (
                <AccEmpty icon={TrendingUp} title="İşlem yok" description="Henüz finans hareketi bulunmuyor." />
              ) : (
                <AccTableWrap>
                  <div className="divide-y divide-ena-border/50">
                    {(billing.transactions || []).slice(0, 20).map((t: any) => (
                      <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 hover:bg-ena-primary/5 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium shrink-0 ${
                            t.type === "payment" ? "acc-badge-success" :
                            t.type === "invoice" ? "acc-badge-info" :
                            "acc-badge-warning"
                          }`}>{t.type}</span>
                          <div className="min-w-0">
                            <p className="text-xs text-ena-light truncate">{t.note || ""}</p>
                            <p className="text-[10px] text-ena-light/60">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-ena-text tabular-nums">{fmt(t.amount)}</p>
                          <p className="text-[10px] text-ena-light">Bakiye: {fmt(t.balanceAfter)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccTableWrap>
              )}
            </div>
          </div>
        )
      )}

      {/* ===== NOTIFICATIONS ===== */}
      {tab === "notifications" && (<NotificationsTab />)}

      {/* ===== SAVED CARTS ===== */}
      {tab === "saved-carts" && (<SavedCartsTab />)}

      {/* ===== COUPONS ===== */}
      {tab === "coupons" && (<CouponsTab />)}
      {tab === "integrations" && (<IntegrationsTab />)}
    </>
  );
}

function IntegrationsTab() {
  const [connections, setConnections] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [premiumProducts, setPremiumProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [form, setForm] = useState({ platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" });

  const load = async () => {
    setLoading(true);
    const [res, productsRes] = await Promise.all([
      fetch("/api/dealer/marketplace"),
      fetch("/api/customer-products"),
    ]);
    const d = await res.json();
    const pd = await productsRes.json();
    if (d.success) {
      setConnections(d.data.connections || []);
      setOrders(d.data.orders || []);
      if (d.data.dealer) setTelegramId(d.data.dealer.telegramChatId || "");
    }
    if (pd.success) setPremiumProducts((pd.data?.products || []).filter((p: any) => p.moduleKey !== "ENA_COMMERCE"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.sellerId || !form.apiKey) return toast.error("Seller ID ve API Key zorunlu");
    setSaving(true);
    const res = await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: editing ? "update" : "create", ...form, id: editing }) });
    const d = await res.json();
    if (d.success) { toast.success(editing ? "Güncellendi" : "Mağaza bağlandı!"); load(); setShowForm(false); setEditing(null); }
    else toast.error(d.error || "Hata");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bağlantıyı sil?")) return;
    await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  };

  const handleSaveTelegram = async () => {
    await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveTelegram", telegramChatId: telegramId }) });
    toast.success("Telegram ID kaydedildi");
  };

  if (loading) return <AccSkeleton rows={3} />;

  const platforms: Record<string, string> = { trendyol: "Trendyol", hepsiburada: "Hepsiburada", n11: "N11" };
  const matchLabels: Record<string, string> = { product_name: "Ürün Adı", barcode: "Barkod", sku: "Model Kod", category: "Kategori" };
  const statusLabels: Record<string, string> = { new: "Yeni", processing: "İşleniyor", completed: "Tamamlandı", pending_payment: "Bakiye Bekliyor", awaiting_status: "Statü Bekliyor" };

  return (
    <div className="space-y-6">
      <AccPageTitle title="Entegrasyonlar" description="Premium modüller, marketplace ve bildirim bağlantıları" />

      {premiumProducts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {premiumProducts.map((p: any) => (
            <PremiumModuleCard key={p.moduleKey} product={p} />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AccCard>
          <div className="flex items-center gap-2 mb-2">
            <Key size={16} className="text-ena-primary" />
            <h3 className="text-sm font-semibold text-ena-text">API Keys</h3>
          </div>
          <p className="text-xs text-ena-light">Programatik erişim anahtarları yakında aktif olacak.</p>
          <span className="inline-flex mt-3 text-[10px] px-2 py-1 rounded-full acc-badge-neutral font-medium">Yakında</span>
        </AccCard>
        <AccCard>
          <div className="flex items-center gap-2 mb-2">
            <Webhook size={16} className="text-ena-primary" />
            <h3 className="text-sm font-semibold text-ena-text">Webhooks</h3>
          </div>
          <p className="text-xs text-ena-light">Sipariş ve stok olayları için webhook yapılandırması.</p>
          <span className="inline-flex mt-3 text-[10px] px-2 py-1 rounded-full acc-badge-neutral font-medium">Yakında</span>
        </AccCard>
        <AccCard>
          <div className="flex items-center gap-2 mb-2">
            <Store size={16} className="text-ena-primary" />
            <h3 className="text-sm font-semibold text-ena-text">Marketplace</h3>
          </div>
          <p className="text-xs text-ena-light">{connections.length} bağlı mağaza · {orders.length} sipariş</p>
          <button onClick={() => { setEditing(null); setForm({ platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" }); setShowForm(true); }} className="mt-3 text-xs text-ena-primary hover:underline">
            Mağaza bağla
          </button>
        </AccCard>
      </div>

      <AccCard>
        <p className="text-xs text-ena-light/60 uppercase mb-1 flex items-center gap-1"><MessageCircle size={12} /> Telegram Bildirim</p>
        <div className="flex gap-2 mt-2">
          <input className="flex-1 rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text font-mono" placeholder="Chat ID" value={telegramId} onChange={e => setTelegramId(e.target.value)} />
          <button onClick={handleSaveTelegram} className="px-4 py-2 bg-ena-primary text-ena-text text-sm rounded-lg hover:brightness-90 transition-colors">Kaydet</button>
        </div>
        <p className="text-[10px] text-ena-light/40 mt-2"><a href="https://t.me/userinfobot" target="_blank" className="text-ena-primary hover:underline">@userinfobot</a> ile Chat ID al → <a href="https://t.me/enaunitybot" target="_blank" className="text-ena-primary hover:underline">@enaunitybot</a>&apos;a /start yaz</p>
      </AccCard>

      {showForm && (
        <div className="acc-card border-ena-primary/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ena-text">{editing ? "Düzenle" : "Mağaza Bağla"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-ena-light/50 hover:text-ena-light"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-[10px] uppercase text-ena-light/60 mb-1">Platform</label><select className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>{Object.entries(platforms).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-[10px] uppercase text-ena-light/60 mb-1">Seller ID</label><input className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text" value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })} /></div>
            <div><label className="block text-[10px] uppercase text-ena-light/60 mb-1">API Key</label><input className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text font-mono" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-[10px] uppercase text-ena-light/60 mb-1">API Secret</label><input className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text font-mono" value={form.apiSecret} onChange={e => setForm({ ...form, apiSecret: e.target.value })} /></div>
            <div><label className="block text-[10px] uppercase text-ena-light/60 mb-1">Eşleştirme</label><select className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text" value={form.matchMethod} onChange={e => setForm({ ...form, matchMethod: e.target.value })}>{Object.entries(matchLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-ena-primary text-ena-text text-sm rounded-lg hover:brightness-90 transition-colors disabled:opacity-50">{saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Bağla"}</button><button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-ena-light text-sm hover:text-ena-text">İptal</button></div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ena-text flex items-center gap-2"><Store size={14} />Bağlı Mağazalar ({connections.length})</h3>
        <button onClick={() => { setEditing(null); setForm({ platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" }); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-ena-primary text-ena-text text-xs rounded-lg hover:brightness-90"><Plus size={12} />Mağaza Bağla</button>
      </div>

      {connections.map(c => (
        <div key={c.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-ena-primary/10 text-ena-primary mr-2">{platforms[c.platform] || c.platform}</span>
            <span className="text-xs text-ena-light/50 font-mono">Mağaza: {c.sellerId}</span>
            <p className="text-[10px] text-ena-light/30 mt-1">Eşleşme: {matchLabels[c.matchMethod] || c.matchMethod} | {c.active ? "Aktif" : "Pasif"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditing(c.id); setForm({ platform: c.platform, sellerId: c.sellerId, apiKey: c.apiKey, apiSecret: c.apiSecret || "", matchMethod: c.matchMethod || "product_name" }); setShowForm(true); }} className="text-xs text-ena-primary hover:text-ena-primary">Düzenle</button>
            <button onClick={() => handleDelete(c.id)} className="text-xs text-ena-primary hover:text-red-300"><Trash2 size={12} /></button>
          </div>
        </div>
      ))}

      <h3 className="text-sm font-semibold text-ena-text flex items-center gap-2"><Package size={14} />Siparişler ({orders.length})</h3>
      {orders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ena-border rounded-xl"><Package size={32} className="mx-auto text-ena-light/20" /><p className="mt-2 text-ena-light/50 text-sm">Henüz sipariş yok</p></div>
      ) : (
        <div className="rounded-xl border border-ena-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ena-card/50"><tr><th className="px-4 py-3 text-left text-[10px] uppercase text-ena-light/60">Platform</th><th className="px-4 py-3 text-left text-[10px] uppercase text-ena-light/60">Sipariş No</th><th className="px-4 py-3 text-left text-[10px] uppercase text-ena-light/60">Müşteri</th><th className="px-4 py-3 text-right text-[10px] uppercase text-ena-light/60">Tutar</th><th className="px-4 py-3 text-left text-[10px] uppercase text-ena-light/60">Durum</th></tr></thead>
            <tbody className="divide-y divide-ena-border">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-ena-card/20">
                  <td className="px-4 py-3 text-xs text-ena-text">{platforms[o.platform] || o.platform}</td>
                  <td className="px-4 py-3 text-xs font-mono text-ena-light/60">{o.platformOrderId}</td>
                  <td className="px-4 py-3 text-xs text-ena-text">{o.customerName || "—"}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-ena-text text-right">₺{o.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[10px] text-ena-light/60">{statusLabels[o.status] || o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/notifications").then(r => r.json()).then(d => setList(d.data || [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div>;
  if (list.length === 0) return <div className="text-center py-16 border border-dashed border-ena-border rounded"><Bell size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Bildirim yok</p></div>;
  return (
    <div className="space-y-2">
      {list.map((n: any) => (
        <div key={n.id} className={`rounded-xl border p-4 ${n.read ? "border-ena-border bg-ena-card/20" : "border-ena-primary/30 bg-ena-primary/5"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.read ? "text-ena-text" : "text-ena-text font-semibold"}`}>{n.title}</p>
              {n.message && <p className="text-xs text-ena-light/60 mt-1">{n.message}</p>}
              <p className="text-[10px] text-ena-light/30 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString("tr-TR") : ""}</p>
            </div>
            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${n.read ? "bg-transparent" : "bg-ena-primary"}`} />
          </div>
          {n.link && <a href={n.link} className="text-xs text-ena-primary hover:text-ena-primary mt-2 inline-block">İncele →</a>}
        </div>
      ))}
    </div>
  );
}

function SavedCartsTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/cart/saved").then(r => r.json()).then(d => setList(d.data || [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div>;
  if (list.length === 0) return <div className="text-center py-16 border border-dashed border-ena-border rounded"><Save size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Kayıtlı sepet yok</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {list.map((cart: any) => (
        <div key={cart.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-4">
          <p className="text-sm font-medium text-ena-text">{cart.name || `Sepet #${cart.id.slice(0, 6)}`}</p>
          <p className="text-xs text-ena-light/50">{cart.items?.length || 0} ürün</p>
          {cart.total && <p className="text-sm font-bold text-ena-text mt-2">{fmt(cart.total)}</p>}
          <Link href={cart.link || "/cart"} className="text-xs text-ena-primary hover:text-ena-primary mt-2 inline-block">Sepete Git →</Link>
        </div>
      ))}
    </div>
  );
}

function CouponsTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/coupons").then(r => r.json()).then(d => setList(d.data || [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="animate-pulse space-y-3"><div className="h-16 rounded bg-ena-card/50" /><div className="h-16 rounded bg-ena-card/50" /></div>;
  if (list.length === 0) return <div className="text-center py-16 border border-dashed border-ena-border rounded"><Gift size={40} className="mx-auto text-ena-light/30" /><p className="mt-3 text-ena-light">Aktif kampanya yok</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {list.map((c: any) => (
        <div key={c.id} className="rounded-xl border border-ena-border bg-gradient-to-br acc-card p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2"><Gift size={16} className="text-ena-primary" /><span className="font-semibold text-ena-text text-sm">{c.code || c.name}</span></div>
            <Tag size={14} className="text-ena-light/30" />
          </div>
          <p className="text-xs text-ena-light/60 mb-1">{c.description || ""}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-ena-border/50">
            <span className="text-xs text-ena-light/40">{c.discount ? `%${c.discount}` : c.type}</span>
            {c.expiresAt && <span className="text-[10px] text-ena-light/30">{new Date(c.expiresAt).toLocaleDateString("tr-TR")} kadar</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
