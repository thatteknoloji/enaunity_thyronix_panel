"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store, Search, CheckCircle, XCircle, Truck, ChevronDown, ChevronUp, ArrowUpDown, Package, ChevronLeft, ChevronRight, FileText, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import OperasyonOrdersPanel from "@/components/admin/OperasyonOrdersPanel";

interface Order {
  id: string; total: number; discount: number; status: string; address: string; createdAt: string;
  trackingNumber: string; carrier: string;
  user: { name: string; email: string };
  dealer?: { id: string; company: string; name: string } | null;
  items: Array<{ id: string; productId: string; quantity: number; price: number; product: { name: string; image: string } }>;
  statusHistory?: Array<{ id: string; status: string; note: string; changedBy: string; createdAt: string }>;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string; fileType: string }>;
}

const STATUS_TABS = [
  { key: "all", label: "Tümü" },
  { key: "pending_approval", label: "Onay Bekliyor" },
  { key: "approved", label: "Onaylandı" },
  { key: "pending", label: "Beklemede" },
  { key: "shipped", label: "Kargoda" },
  { key: "delivered", label: "Teslim" },
  { key: "cancelled", label: "İptal" },
];

const statusColors: Record<string, string> = {
  pending_approval: "text-amber-700 bg-amber-50 border-amber-200",
  approved: "text-blue-700 bg-blue-50 border-blue-200",
  pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
  shipped: "text-purple-700 bg-purple-50 border-purple-200",
  delivered: "text-green-700 bg-green-50 border-green-200",
  cancelled: "text-ena-primary bg-ena-primary/5 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  pending: "Beklemede",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Yükleniyor…</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "operasyon" ? "operasyon" : "b2b";
  const [viewMode, setViewMode] = useState<"b2b" | "operasyon">(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [stockStatusMap, setStockStatusMap] = useState<Record<string, any>>({});

  // Tracking state
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { trackingNumber: string; carrier: string }>>({});

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams();
    params.set("excludeMarketplace", "true");
    params.set("limit", "20");
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (activeTab !== "all") params.set("status", activeTab);
    if (sort) params.set("sort", sort);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);

    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data || []);
        setTotal(d.pagination?.total || 0);
        setTotalPages(d.pagination?.totalPages || 1);
        setLoading(false);
      });
  }, [search, activeTab, sort, page, fromDate, toDate, minAmount, maxAmount]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!expandedId) return;
    fetch(`/api/admin/orders/${expandedId}/stock`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStockStatusMap((prev) => ({ ...prev, [expandedId]: d.data }));
      });
  }, [expandedId]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
    setUpdating(null);
  };

  const updateTracking = async (id: string) => {
    const input = trackingInputs[id];
    if (!input?.trackingNumber) return;
    await fetch(`/api/admin/orders/${id}/tracking`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    toast.success("Takip bilgisi kaydedildi");
    fetchOrders();
  };

  const batchAction = async (action: "approve" | "cancel" | "ship") => {
    if (selected.size === 0) return toast.error("Önce sipariş seçin");
    if (!confirm(`${selected.size} siparişe "${action === "approve" ? "onayla" : action === "cancel" ? "iptal" : "kargoya ver"}" işlemi uygulansın mı?`)) return;
    setBatchLoading(true);
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    if (res.ok) {
      toast.success(`${selected.size} sipariş güncellendi`);
      setSelected(new Set());
      fetchOrders();
    } else {
      toast.error("İşlem başarısız");
    }
    setBatchLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  const clearFilters = () => {
    setSearch(""); setFromDate(""); setToDate(""); setMinAmount(""); setMaxAmount("");
    setActiveTab("all"); setSort("date-desc"); setPage(1);
  };

  const hasFilters = search || activeTab !== "all" || fromDate || toDate || minAmount || maxAmount;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
        <p className="text-sm text-gray-500 mt-1">
          {viewMode === "b2b" ? `Toplam ${total} B2B sipariş` : "Operasyon / pazaryeri siparişleri ve maliyet analizi"}
        </p>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setViewMode("b2b")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "b2b" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
        >
          B2B Siparişler
        </button>
        <button
          onClick={() => setViewMode("operasyon")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "operasyon" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
        >
          Operasyon Siparişleri
        </button>
      </div>

      {viewMode === "operasyon" ? (
        <OperasyonOrdersPanel scope="admin" />
      ) : (
        <>

      {/* Arama + Filtre Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mb-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Sipariş no, müşteri, bayi ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none" title="Başlangıç" />
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none" title="Bitiş" />
            <input type="number" placeholder="Min ₺" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(1); }} className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none" />
            <input type="number" placeholder="Max ₺" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }} className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none" />
            {hasFilters && (
              <button onClick={clearFilters} className="px-2 py-2 text-xs text-ena-primary hover:bg-ena-primary/5 rounded-lg transition-colors">Temizle</button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => { setSort(sort === "date-desc" ? "date-asc" : sort === "date-asc" ? "amount-desc" : sort === "amount-desc" ? "amount-asc" : "date-desc"); }}
            className="ml-auto px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-100 flex items-center gap-1" title="Sırala">
            <ArrowUpDown size={12} />
            {sort === "date-desc" ? "En Yeni" : sort === "date-asc" ? "En Eski" : sort === "amount-desc" ? "En Yüksek" : "En Düşük"}
          </button>
        </div>

        {/* Batch Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">{selected.size} seçili</span>
            <button onClick={() => batchAction("approve")} disabled={batchLoading} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              <CheckCircle size={14} /> Onayla
            </button>
            <button onClick={() => batchAction("ship")} disabled={batchLoading} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
              <Truck size={14} /> Kargoya Ver
            </button>
            <button onClick={() => batchAction("cancel")} disabled={batchLoading} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-ena-primary/5 text-ena-primary border border-red-200 hover:bg-ena-primary/10">
              <XCircle size={14} /> İptal
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 ml-2">Seçimi Temizle</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <ShoppingCart size={40} className="mx-auto text-gray-300 animate-pulse" />
          <p className="mt-3 text-gray-500">Yükleniyor...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <ShoppingCart size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Sipariş bulunamadı</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{order.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{order.user.email}</p>
                        {order.dealer && (
                          <p className="text-[11px] text-purple-600 flex items-center gap-1 truncate"><Store size={11} /> {order.dealer.company}</p>
                        )}
                        <p className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1.5 shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${statusColors[order.status] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      <p className="text-base font-bold text-gray-900">{formatPrice(order.total)}</p>
                      {order.discount > 0 && <p className="text-[11px] text-emerald-600">-{formatPrice(order.discount)}</p>}
                      {order.trackingNumber && <p className="text-[10px] text-blue-600 font-mono">{order.carrier}: {order.trackingNumber}</p>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {order.status === "pending_approval" ? (
                      <>
                        <button onClick={() => updateStatus(order.id, "approved")} disabled={updating === order.id}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                          <CheckCircle size={13} /> Onayla
                        </button>
                        <button onClick={() => updateStatus(order.id, "cancelled")} disabled={updating === order.id}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-ena-primary/5 text-ena-primary border border-red-200 hover:bg-ena-primary/10 transition-colors">
                          <XCircle size={13} /> Reddet
                        </button>
                      </>
                    ) : order.status !== "cancelled" && order.status !== "delivered" ? (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className="text-[11px] rounded-lg border px-2.5 py-1.5 font-medium focus:outline-none focus:ring-0 cursor-pointer bg-white border-gray-200 text-gray-700"
                      >
                        {order.status !== "pending_approval" && <option value="approved">Onaylandı</option>}
                        <option value="pending">Beklemede</option>
                        <option value="shipped">Kargoda</option>
                        <option value="delivered">Teslim Edildi</option>
                        <option value="cancelled">İptal</option>
                      </select>
                    ) : null}

                    {/* Tracking input for shipped/delivered */}
                    {(order.status === "shipped" || order.status === "delivered") && (
                      <div className="flex flex-wrap gap-1.5 ml-auto">
                        <input
                          placeholder="Takip no"
                          value={trackingInputs[order.id]?.trackingNumber ?? order.trackingNumber}
                          onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: { ...trackingInputs[order.id], trackingNumber: e.target.value, carrier: trackingInputs[order.id]?.carrier || order.carrier } })}
                          className="flex-1 min-w-[100px] rounded border border-gray-200 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                        <select
                          value={trackingInputs[order.id]?.carrier ?? order.carrier}
                          onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: { ...trackingInputs[order.id], carrier: e.target.value, trackingNumber: trackingInputs[order.id]?.trackingNumber || order.trackingNumber } })}
                          className="rounded border border-gray-200 px-2 py-1.5 text-[11px] focus:outline-none"
                        >
                          <option value="">Kargo</option>
                          <option value="PTT">PTT</option>
                          <option value="Aras Kargo">Aras Kargo</option>
                          <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                          <option value="MNG Kargo">MNG Kargo</option>
                          <option value="Sürat Kargo">Sürat Kargo</option>
                          <option value="UPS">UPS</option>
                          <option value="FedEx">FedEx</option>
                          <option value="Diğer">Diğer</option>
                        </select>
                        <button onClick={() => updateTracking(order.id)}
                          className="px-2.5 py-1.5 rounded bg-gray-900 text-white text-[11px] hover:bg-gray-800 transition-colors shrink-0">Kaydet</button>
                      </div>
                    )}

                    <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors ml-auto">
                      {expandedId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {order.items.length} ürün
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {expandedId === order.id && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 rounded-b-xl">
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded bg-gray-200 shrink-0 flex items-center justify-center text-[9px] text-gray-400">
                              <Package size={12} />
                            </div>
                            <span className="truncate text-gray-700">{item.product.name}</span>
                            <span className="text-gray-400">x{item.quantity}</span>
                          </div>
                          <span className="font-medium text-gray-900 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-sm">
                        <span className="font-semibold text-gray-900">Toplam</span>
                        <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
                      </div>
                      {order.attachments && order.attachments.length > 0 && (
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Ekler ({order.attachments.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {order.attachments.map((att: any) => (
                              <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                {att.fileType === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                                {att.fileName.length > 20 ? att.fileName.slice(0, 18) + "..." : att.fileName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Durum Geçmişi</p>
                          <div className="space-y-1">
                            {order.statusHistory.map((h: any) => (
                              <div key={h.id} className="flex items-center gap-2 text-[10px]">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  h.status === "delivered" ? "bg-green-500" : h.status === "shipped" ? "bg-blue-500" : h.status === "cancelled" ? "bg-ena-primary/50" : h.status === "approved" ? "bg-emerald-500" : "bg-yellow-500"
                                }`} />
                                <span className="text-gray-600">{statusLabels[h.status] || h.status}</span>
                                <span className="text-gray-400">{formatDate(h.createdAt)}</span>
                                <span className="text-gray-400 text-[9px]">{h.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {stockStatusMap[order.id] && (
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Depo / Stok</p>
                          <div className="flex gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${stockStatusMap[order.id].reserved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {stockStatusMap[order.id].reserved ? "Rezerve" : "Rezervasyon yok"}
                            </span>
                            {stockStatusMap[order.id].hasWarnings && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">Stok uyarısı</span>
                            )}
                          </div>
                          {stockStatusMap[order.id].items?.map((item: any) => (
                            <div key={item.orderItemId} className="flex justify-between text-[10px] text-gray-600 py-0.5">
                              <span>{item.productName}</span>
                              <span>{item.unmatched ? "Eşleşmedi" : item.insufficient ? "Yetersiz" : item.reserved ? "OK" : "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                <span key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-300 mx-0.5">...</span>}
                  <button onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                    {p}
                  </button>
                </span>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
