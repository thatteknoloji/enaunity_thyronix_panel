"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Filter } from "lucide-react";
import Link from "next/link";
import { getOrderPaymentInfo } from "@/lib/orders/payment-metadata";

interface Order {
  id: string;
  total: number;
  status: string;
  fulfillmentStatus?: string;
  displayStatus?: string;
  sourceType?: string;
  marketplace?: string;
  orderNumber?: string;
  address: string;
  createdAt: string;
  engine?: string;
  metadataJson?: string;
  items: Array<{
    id: string;
    product: { name: string; image: string };
    quantity: number;
    price: number;
  }>;
}

const statusOptions = [
  { value: "", label: "Tümü" },
  { value: "B2B", label: "B2B Siparişler", filter: "sourceType" },
  { value: "MARKETPLACE_HUB", label: "Pazaryeri", filter: "sourceType" },
  { value: "WAITING_FOR_PACKING", label: "Operasyon Bekleyen", filter: "fulfillmentStatus" },
  { value: "READY_TO_SHIP", label: "Kargoya Hazır", filter: "fulfillmentStatus" },
  { value: "DELIVERED", label: "Teslim Edildi", filter: "fulfillmentStatus" },
  { value: "pending", label: "Hazırlanıyor", filter: "status" },
  { value: "pending_approval", label: "Onay Bekliyor", filter: "status" },
  { value: "shipped", label: "Kargoda", filter: "status" },
  { value: "cancelled", label: "İptal", filter: "status" },
];

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  pending_approval: "warning",
  approved: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
};

const statusText: Record<string, string> = {
  pending: "Hazırlanıyor",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

export default function DealerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    const opt = statusOptions.find((o) => o.value === statusFilter);
    if (opt && "filter" in opt && opt.filter === "sourceType") params.set("sourceType", statusFilter);
    else if (opt && "filter" in opt && opt.filter === "fulfillmentStatus") params.set("fulfillmentStatus", statusFilter);
    else if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/dealer/orders?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setOrders(d.data);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, statusFilter]);

  const filtered = orders.filter((o) => {
    const matchSearch = search === "" ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.product.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus =
      statusFilter === "" ||
      o.status === statusFilter ||
      o.fulfillmentStatus === statusFilter ||
      o.displayStatus === statusFilter ||
      o.sourceType === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-64 rounded bg-ena-card/50" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ena-text mb-6">Siparişlerim</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ena-light/40" />
          <input
            placeholder="Sipariş veya ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-ena-border py-2 pl-9 pr-3 text-sm focus:border-ena-border focus:outline-none bg-transparent text-ena-text"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ena-light/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-ena-border py-2 pl-9 pr-8 text-sm focus:border-ena-border focus:outline-none bg-transparent text-ena-text appearance-none cursor-pointer"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl bg-ena-card/30">
          <Package size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light/50">Sipariş bulunamadı</p>
          <Link href="/catalog">
            <span className="text-sm text-purple-600 hover:text-purple-700 font-medium cursor-pointer">Alışverişe Başla →</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const paymentInfo = getOrderPaymentInfo(order);
            return (
            <Link key={order.id} href={`/dealer/orders/${order.id}`} className="block rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm hover:shadow-md hover:border-ena-border/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-ena-light/50">Sipariş #{order.id.slice(0, 8)}</span>
                  <p className="text-xs text-ena-light/40 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant={statusVariant[order.displayStatus || order.fulfillmentStatus || order.status] || "default"}>
                    {statusText[order.displayStatus || order.fulfillmentStatus || order.status] || order.fulfillmentStatus || order.status}
                  </Badge>
                  {paymentInfo.method && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {paymentInfo.label}
                    </span>
                  )}
                  {order.marketplace && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{order.marketplace}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.product.image} alt={item.product.name} className="h-10 w-10 rounded object-cover" />
                    <span className="flex-1 text-sm text-ena-text">{item.product.name} x{item.quantity}</span>
                    <span className="text-sm font-medium text-purple-600">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-ena-border flex justify-between items-center">
                <span className="text-xs text-ena-light/40 truncate max-w-xs">{order.address}</span>
                <span className="text-sm font-bold text-ena-text">Toplam: {formatPrice(order.total)}</span>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
