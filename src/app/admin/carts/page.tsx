"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Bell,
  Clock3,
  Mail,
  MessageSquareText,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

type CartStatus = "live" | "idle" | "abandoned_candidate" | "empty";
type CartAudience = "dealer" | "customer";

type CartSummary = {
  id: string;
  audience: CartAudience;
  status: CartStatus;
  userId: string;
  dealerId: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  company: string;
  dealerName: string;
  dealerGroup: string;
  lastActivityAt: string;
  updatedAt: string;
  createdAt: string;
  itemCount: number;
  totalQuantity: number;
  cartTotal: number;
  lastReminderAt: string | null;
  reminderCount: number;
  lastReminderChannel: string | null;
  recentProducts: Array<{
    id: string;
    name: string;
    image: string;
    quantity: number;
    sku: string;
    barcode: string;
  }>;
  hasCheckoutStarted: boolean;
};

type CartMetrics = {
  total: number;
  live: number;
  idle: number;
  abandoned: number;
  dealers: number;
  customers: number;
  totalValue: number;
};

type CartDetail = {
  summary: CartSummary;
  account: {
    audience: CartAudience;
    company: string;
    dealerName: string;
    dealerGroup: string;
    contactName: string;
    email: string;
    phone: string;
    billingAddress: string;
    shippingAddress: string;
    taxNumber: string;
  };
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    effectivePrice: number;
    lineTotal: number;
    product: {
      id: string;
      name: string;
      image: string;
      sku: string;
      barcode: string;
      modelCode: string;
      category: string;
      stock: number;
    };
  }>;
  campaigns: Array<{
    id: string;
    label: string;
    discount: number;
    freeShipping: boolean;
  }>;
  activities: Array<{
    id: string;
    eventType: string;
    productId: string;
    variantId: string;
    quantityBefore: number;
    quantityAfter: number;
    cartItemCount: number;
    cartTotalSnapshot: number;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  reminderLogs: Array<{
    id: string;
    channel: string;
    templateKey: string;
    status: string;
    sentByAdminId: string;
    sentByAdminName: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  savedCarts: Array<{
    id: string;
    name: string;
    total: number;
    updatedAt: string;
    itemCount: number;
  }>;
  relatedOrders: Array<{
    id: string;
    total: number;
    status: string;
    createdAt: string;
    isConvertedFromThisCart: boolean;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      productName: string;
      image: string;
    }>;
  }>;
};

type Suggestion = {
  key: "quote" | "support_call" | "saved_cart";
  label: string;
  description: string;
  risk: string;
};

const statusMeta: Record<CartStatus, { label: string; className: string }> = {
  live: { label: "Canlı", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  idle: { label: "Bekliyor", className: "bg-amber-50 text-amber-700 border-amber-200" },
  abandoned_candidate: { label: "Terk Adayı", className: "bg-rose-50 text-rose-700 border-rose-200" },
  empty: { label: "Boş", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

const audienceMeta: Record<CartAudience, { label: string; className: string }> = {
  dealer: { label: "Bayi", className: "bg-blue-50 text-blue-700 border-blue-200" },
  customer: { label: "Müşteri", className: "bg-slate-50 text-slate-700 border-slate-200" },
};

const activityLabels: Record<string, string> = {
  add: "Ürün eklendi",
  update_qty: "Adet güncellendi",
  remove: "Ürün çıkarıldı",
  clear: "Sepet temizlendi",
  checkout_started: "Checkout başlatıldı",
  checkout_completed: "Siparişe dönüştü",
  saved_cart_created: "Kayıtlı sepet oluşturuldu",
};

function badgeClassName(value: string) {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${value}`;
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShoppingCart;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-gray-100 p-3 text-gray-700">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AdminCartsPage() {
  const [filters, setFilters] = useState({
    audience: "all",
    status: "all",
    search: "",
    productQuery: "",
    minTotal: "",
    maxTotal: "",
    activityFrom: "",
    activityTo: "",
  });
  const [page, setPage] = useState(1);
  const [metrics, setMetrics] = useState<CartMetrics | null>(null);
  const [carts, setCarts] = useState<CartSummary[]>([]);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CartDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "18");
    if (filters.audience !== "all") params.set("audience", filters.audience);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.productQuery.trim()) params.set("productQuery", filters.productQuery.trim());
    if (filters.minTotal.trim()) params.set("minTotal", filters.minTotal.trim());
    if (filters.maxTotal.trim()) params.set("maxTotal", filters.maxTotal.trim());
    if (filters.activityFrom.trim()) params.set("activityFrom", filters.activityFrom.trim());
    if (filters.activityTo.trim()) params.set("activityTo", filters.activityTo.trim());
    return params.toString();
  }, [filters, page]);

  const fetchMetrics = useCallback(async () => {
    const res = await fetch("/api/admin/carts/metrics");
    const data = await res.json();
    if (data.success) setMetrics(data.data);
  }, []);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    const res = await fetch(`/api/admin/carts?${queryString}`);
    const data = await res.json();
    if (data.success) {
      setCarts(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      if (!selectedCartId && data.data?.length) {
        setSelectedCartId(data.data[0].id);
      } else if (selectedCartId && !data.data?.some((item: CartSummary) => item.id === selectedCartId)) {
        setSelectedCartId(data.data?.[0]?.id || null);
      }
    }
    setLoadingList(false);
  }, [queryString, selectedCartId]);

  const fetchDetail = useCallback(async (cartId: string, silent = false) => {
    if (!silent) setLoadingDetail(true);
    const res = await fetch(`/api/admin/carts/${cartId}`);
    const data = await res.json();
    if (data.success) {
      setDetail(data.data);
    }
    if (!silent) setLoadingDetail(false);
  }, []);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!selectedCartId) {
      setDetail(null);
      return;
    }
    void fetchDetail(selectedCartId);
  }, [fetchDetail, selectedCartId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchList();
      void fetchMetrics();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [fetchList, fetchMetrics]);

  useEffect(() => {
    if (!selectedCartId) return undefined;
    const timer = window.setInterval(() => {
      void fetchDetail(selectedCartId, true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [fetchDetail, selectedCartId]);

  const runReminder = async (channel: "panel" | "email" | "both", templateKey: string) => {
    if (!selectedCartId) return;
    setLoadingAction(`reminder:${channel}:${templateKey}`);
    const res = await fetch(`/api/admin/carts/${selectedCartId}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, templateKey }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Hatırlatma gönderildi");
      void fetchDetail(selectedCartId, true);
      void fetchList();
    } else {
      toast.error(data.error || "Hatırlatma gönderilemedi");
    }
    setLoadingAction(null);
  };

  const loadSuggestions = async () => {
    if (!selectedCartId) return;
    setLoadingAction("suggestions");
    const res = await fetch(`/api/admin/carts/${selectedCartId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.success) {
      setSuggestions(data.data.suggestions || []);
      toast.success("Öneriler hazır");
    } else {
      toast.error(data.error || "Öneriler hazırlanamadı");
    }
    setLoadingAction(null);
  };

  const applySuggestion = async (action: "quote" | "support_call" | "saved_cart" | "sales_task") => {
    if (!selectedCartId) return;
    setLoadingAction(`suggestion:${action}`);
    const res = await fetch(`/api/admin/carts/${selectedCartId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(action === "sales_task" ? "Görev notu oluşturuldu" : "Öneri aksiyonu işlendi");
    } else {
      toast.error(data.error || "Aksiyon işlenemedi");
    }
    setLoadingAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canlı Sepetler</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bayi ve müşteri sepetlerini tek merkezden izle, hatırlatma gönder ve dönüşüm riskini yönet.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { void fetchList(); void fetchMetrics(); if (selectedCartId) void fetchDetail(selectedCartId, true); }}>
          <RefreshCw size={16} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Açık Sepet" value={String(metrics?.total || 0)} hint="Ürün içeren aktif sepetler" icon={ShoppingCart} />
        <MetricCard label="Canlı" value={String(metrics?.live || 0)} hint="Son 15 dakikada hareket var" icon={Activity} />
        <MetricCard label="Riskli" value={String(metrics?.abandoned || 0)} hint="24 saati aşan aday sepetler" icon={Clock3} />
        <MetricCard label="Toplam Değer" value={formatPrice(metrics?.totalValue || 0)} hint={`${metrics?.dealers || 0} bayi • ${metrics?.customers || 0} müşteri`} icon={Wallet} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-9">
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Hızlı Arama</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                }}
                placeholder="Bayi, müşteri, e-posta, telefon"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-gray-400"
              />
            </div>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Kitle</span>
            <select
              value={filters.audience}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, audience: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            >
              <option value="all">Tümü</option>
              <option value="dealer">Bayi</option>
              <option value="customer">Müşteri</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Durum</span>
            <select
              value={filters.status}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            >
              <option value="all">Tümü</option>
              <option value="live">Canlı</option>
              <option value="idle">Bekliyor</option>
              <option value="abandoned_candidate">Terk Adayı</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Min Tutar</span>
            <input
              value={filters.minTotal}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, minTotal: event.target.value }));
              }}
              placeholder="0"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Max Tutar</span>
            <input
              value={filters.maxTotal}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, maxTotal: event.target.value }));
              }}
              placeholder="250000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Aktivite Başlangıç</span>
            <input
              type="date"
              value={filters.activityFrom}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, activityFrom: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Aktivite Bitiş</span>
            <input
              type="date"
              value={filters.activityTo}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, activityTo: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Ürün / SKU</span>
            <input
              value={filters.productQuery}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, productQuery: event.target.value }));
              }}
              placeholder="Ürün, barkod, SKU"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">Sepet Akışı</h2>
              <p className="text-xs text-gray-500">{pagination.total} sepet bulundu</p>
            </div>
            <div className="text-xs text-gray-500">Sayfa {pagination.page} / {pagination.totalPages}</div>
          </div>

          <div className="max-h-[980px] overflow-y-auto divide-y divide-gray-100">
            {loadingList ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : carts.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">Filtreye uygun sepet bulunamadı.</div>
            ) : (
              carts.map((cart) => (
                <button
                  key={cart.id}
                  onClick={() => setSelectedCartId(cart.id)}
                  className={`w-full px-5 py-4 text-left transition hover:bg-gray-50 ${selectedCartId === cart.id ? "bg-blue-50/60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={badgeClassName(audienceMeta[cart.audience].className)}>
                          {audienceMeta[cart.audience].label}
                        </span>
                        <span className={badgeClassName(statusMeta[cart.status].className)}>
                          {statusMeta[cart.status].label}
                        </span>
                        {cart.hasCheckoutStarted ? (
                          <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                            Checkout başlatıldı
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-base font-semibold text-gray-900">
                        {cart.company || cart.dealerName || cart.userName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {cart.userName} • {cart.userEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{formatPrice(cart.cartTotal)}</p>
                      <p className="text-xs text-gray-500">{cart.totalQuantity} adet • {cart.itemCount} kalem</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {cart.recentProducts.map((product) => (
                      <span key={product.id} className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                        <img src={product.image || "/placeholder.svg"} alt="" className="h-5 w-5 rounded-full object-cover" />
                        <span className="truncate">{product.name}</span>
                        <span className="font-semibold">x{product.quantity}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>Son aktivite: {formatDate(cart.lastActivityAt)}</span>
                    <span>Hatırlatma: {cart.reminderCount} kez</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Önceki
            </Button>
            <span className="text-xs text-gray-500">{pagination.total} kayıt</span>
            <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((prev) => prev + 1)}>
              Sonraki
            </Button>
          </div>
        </section>

        <section className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {!selectedCartId ? (
            <div className="flex min-h-[720px] flex-col items-center justify-center gap-3 text-center">
              <ShoppingCart size={40} className="text-gray-300" />
              <p className="text-lg font-semibold text-gray-700">Sepet seçilmedi</p>
              <p className="max-w-md text-sm text-gray-500">Soldan bir sepet seçildiğinde hesap özeti, ürün içeriği, hareket akışı ve reminder geçmişi burada açılır.</p>
            </div>
          ) : loadingDetail || !detail ? (
            <div className="space-y-4 p-5">
              <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          ) : (
            <div className="max-h-[980px] overflow-y-auto">
              <div className="border-b border-gray-200 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeClassName(audienceMeta[detail.summary.audience].className)}>
                        {audienceMeta[detail.summary.audience].label}
                      </span>
                      <span className={badgeClassName(statusMeta[detail.summary.status].className)}>
                        {statusMeta[detail.summary.status].label}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-gray-900">
                      {detail.account.company || detail.account.dealerName || detail.account.contactName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {detail.account.contactName} • {detail.account.email} • {detail.account.phone || "Telefon yok"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={loadingAction !== null}
                      onClick={() => runReminder("panel", "cart_reminder_basic")}
                    >
                      <Bell size={16} />
                      Panel Bildirimi
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={loadingAction !== null}
                      onClick={() => runReminder("email", "cart_reminder_basic")}
                    >
                      <Mail size={16} />
                      E-posta
                    </Button>
                    <Button
                      className="gap-2"
                      disabled={loadingAction !== null}
                      onClick={() => runReminder("both", "cart_reminder_support")}
                    >
                      <MessageSquareText size={16} />
                      Panel + E-posta
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={loadingAction !== null}
                      onClick={() => runReminder("both", "cart_reminder_quote")}
                    >
                      <Sparkles size={16} />
                      Teklif Hatırlat
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-b border-gray-200 px-5 py-5 md:grid-cols-4">
                <MetricCard label="Sepet Tutarı" value={formatPrice(detail.summary.cartTotal)} hint="Canlı sepet toplamı" icon={Wallet} />
                <MetricCard label="Kalem" value={String(detail.summary.itemCount)} hint={`${detail.summary.totalQuantity} toplam adet`} icon={Package} />
                <MetricCard label="Son Aktivite" value={formatDate(detail.summary.lastActivityAt)} hint="30 sn polling ile güncellenir" icon={Clock3} />
                <MetricCard label="Hatırlatma" value={String(detail.summary.reminderCount)} hint={detail.summary.lastReminderAt ? `Son: ${formatDate(detail.summary.lastReminderAt)}` : "Henüz gönderilmedi"} icon={Bell} />
              </div>

              <div className="grid grid-cols-1 gap-6 px-5 py-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Hesap Özeti</h3>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-start justify-between gap-3">
                      <span>Şirket</span>
                      <span className="font-medium text-gray-900">{detail.account.company || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Bayi / Grup</span>
                      <span className="font-medium text-gray-900">{detail.account.dealerName || "-"} {detail.account.dealerGroup ? `• ${detail.account.dealerGroup}` : ""}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Fatura</span>
                      <span className="max-w-[280px] text-right font-medium text-gray-900">{detail.account.billingAddress || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Teslimat</span>
                      <span className="max-w-[280px] text-right font-medium text-gray-900">{detail.account.shippingAddress || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Vergi No</span>
                      <span className="font-medium text-gray-900">{detail.account.taxNumber || "-"}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Öneri Merkezi</h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" disabled={loadingAction !== null} onClick={loadSuggestions}>
                      <Sparkles size={15} />
                      Gör + Öneri Üret
                    </Button>
                    <Button variant="outline" disabled={loadingAction !== null} onClick={() => applySuggestion("sales_task")}>
                      Satış Görevi Aç
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {suggestions.length === 0 ? (
                      <p className="text-sm text-gray-500">Sepet riskine göre teklif, destek ve kayıtlı sepet tamamlama önerileri burada görünür.</p>
                    ) : (
                      suggestions.map((suggestion) => (
                        <div key={suggestion.key} className="rounded-xl border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-gray-900">{suggestion.label}</p>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">{suggestion.risk}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{suggestion.description}</p>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => applySuggestion(suggestion.key)}>
                              Uygula
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="border-t border-gray-200 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">Canlı Sepet İçeriği</h3>
                  <span className="text-xs text-gray-500">{detail.items.length} kalem</span>
                </div>
                <div className="mt-4 space-y-3">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 p-4">
                      <img src={item.product.image || "/placeholder.svg"} alt={item.product.name} className="h-16 w-16 rounded-2xl object-cover bg-gray-100" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{item.product.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          SKU: {item.product.sku || "-"} • Barkod: {item.product.barcode || "-"} • Model: {item.product.modelCode || "-"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Kategori: {item.product.category || "-"} • Stok: {item.product.stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatPrice(item.lineTotal)}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} adet • {formatPrice(item.effectivePrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900">Kampanya Görünümü</h4>
                    <div className="mt-3 space-y-2">
                      {detail.campaigns.length === 0 ? (
                        <p className="text-sm text-gray-500">Aktif kampanya eşleşmesi yok.</p>
                      ) : (
                        detail.campaigns.map((campaign) => (
                          <div key={campaign.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">{campaign.label}</span>
                            <span className="ml-2">{formatPrice(campaign.discount)}</span>
                            {campaign.freeShipping ? <span className="ml-2 text-emerald-600">Kargo bedava</span> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900">Kaydedilmiş Sepetler</h4>
                    <div className="mt-3 space-y-2">
                      {detail.savedCarts.length === 0 ? (
                        <p className="text-sm text-gray-500">Kayıtlı sepet yok.</p>
                      ) : (
                        detail.savedCarts.map((savedCart) => (
                          <div key={savedCart.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium text-gray-900">{savedCart.name}</p>
                              <p className="text-xs text-gray-500">{savedCart.itemCount} kalem • {formatDate(savedCart.updatedAt)}</p>
                            </div>
                            <span className="font-semibold text-gray-900">{formatPrice(savedCart.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 border-t border-gray-200 px-5 py-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900">Hareket Zaman Çizelgesi</h3>
                  <div className="mt-4 space-y-4">
                    {detail.activities.length === 0 ? (
                      <p className="text-sm text-gray-500">Henüz iz kaydı yok.</p>
                    ) : (
                      detail.activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gray-400" />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-900">{activityLabels[activity.eventType] || activity.eventType}</p>
                              <span className="text-xs text-gray-500">{formatDate(activity.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {activity.quantityBefore} → {activity.quantityAfter} • {activity.cartItemCount} kalem • {formatPrice(activity.cartTotalSnapshot)}
                            </p>
                            {"orderId" in activity.metadata ? (
                              <p className="mt-1 text-xs text-gray-500">Sipariş: {String(activity.metadata.orderId)}</p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900">Hatırlatma Geçmişi</h3>
                  <div className="mt-4 space-y-3">
                    {detail.reminderLogs.length === 0 ? (
                      <p className="text-sm text-gray-500">Gönderilmiş hatırlatma bulunmuyor.</p>
                    ) : (
                      detail.reminderLogs.map((log) => (
                        <div key={log.id} className="rounded-xl bg-gray-50 px-3 py-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-gray-900">{log.templateKey}</p>
                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-gray-600">
                              {log.channel} • {log.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {log.sentByAdminName || "system"} • {formatDate(log.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="border-t border-gray-200 px-5 py-5">
                <h3 className="font-semibold text-gray-900">Siparişe Dönüşmüş Geçmiş</h3>
                <div className="mt-4 space-y-3">
                  {detail.relatedOrders.length === 0 ? (
                    <p className="text-sm text-gray-500">İlişkili sipariş bulunamadı.</p>
                  ) : (
                    detail.relatedOrders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">#{order.id}</p>
                            <p className="mt-1 text-xs text-gray-500">{formatDate(order.createdAt)} • {order.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                            {order.isConvertedFromThisCart ? (
                              <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                Bu sepetten dönüştü
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
