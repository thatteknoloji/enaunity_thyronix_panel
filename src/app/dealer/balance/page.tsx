"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils";
import { Wallet, TrendingDown, TrendingUp, CreditCard, Download, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const TYPE_LABELS: Record<string, string> = {
  order_debit: "Sipariş Kesintisi",
  payment_credit: "Ödeme Girişi",
  return_credit: "İade İadesi",
  term_fee: "Vade Farkı",
  adjustment: "Düzeltme",
  ORDER_COST: "Sipariş Maliyeti",
  PAYMENT: "Ödeme",
  REFUND: "İade",
  MANUAL_ADJUSTMENT: "Manuel Düzeltme",
  SERVICE_FEE: "Hizmet Bedeli",
  SHIPPING_FEE: "Kargo Bedeli",
  PACKAGING_FEE: "Paketleme Bedeli",
  MODULE_PAYMENT: "Modül Ödemesi",
  PRODUCT_PACKAGE_PAYMENT: "Paket Ödemesi",
  TOPUP_CARD: "Kart ile Bakiye",
  TOPUP_BANK: "Havale ile Bakiye",
};

export default function DealerBalancePage() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dealer/balance";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState(5000);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("skip", String(page * pageSize));
    params.set("take", String(pageSize));
    fetch(`/api/dealer/balance?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [from, to, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Hesap Ekstresi", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Bakiye: ${formatPrice(data?.balance || 0)}`, 14, 32);
    doc.text(`Kredi Limiti: ${formatPrice(data?.creditLimit || 0)}`, 14, 38);
    if (from || to) doc.text(`Dönem: ${from || "..."} - ${to || "..."}`, 14, 44);

    doc.setFontSize(8);
    doc.setTextColor(150);
    let y = from || to ? 54 : 46;

    const txns = data?.transactions || [];
    if (txns.length === 0) {
      doc.text("Henüz işlem yok", 14, y);
    } else {
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.setFont("helvetica", "bold");
      doc.text("Tarih", 14, y);
      doc.text("Tür", 40, y);
      doc.text("Açıklama", 70, y);
      doc.text("Tutar", pageW - 40, y, { align: "right" });
      doc.text("Bakiye", pageW - 14, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 4;

      txns.forEach((tx: any, i: number) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const isCredit = tx.credit > 0 || ["payment_credit", "return_credit", "PAYMENT", "REFUND", "MODULE_PAYMENT", "PRODUCT_PACKAGE_PAYMENT"].includes(tx.type);
        doc.setTextColor(isCredit ? 22 : 180);
        doc.text(formatDate(tx.createdAt), 14, y);
        doc.text((TYPE_LABELS[tx.type] || tx.type), 40, y);
        doc.text(tx.note?.slice(0, 30) || "", 70, y);
        doc.text(`${isCredit ? "+" : "-"}${formatPrice(tx.amount)}`, pageW - 40, y, { align: "right" });
        doc.text(formatPrice(tx.balanceAfter), pageW - 14, y, { align: "right" });
        y += 4;
      });
    }

    doc.save(`ekstre-${from || "tum"}-${to || "tum"}.pdf`);
  };

  const startTopUp = async (method: "CARD" | "BANK_TRANSFER") => {
    const min = data?.topUpSettings?.minAmount || 5000;
    if (topUpAmount < min) {
      toast.error(data?.topUpSettings?.belowMinMessage || `Minimum ${formatPrice(min)}`);
      return;
    }
    setTopUpLoading(true);
    try {
      const res = await fetch("/api/dealer/balance/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topUpAmount, method, returnUrl }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "İşlem başarısız");
        return;
      }
      if (d.data.redirectUrl) {
        window.location.href = d.data.redirectUrl;
        return;
      }
      toast.success(method === "BANK_TRANSFER" ? "Talebiniz alındı — onay bekliyor" : "İşlem başlatıldı");
      fetchData();
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-64 rounded bg-ena-card/50" /></div>;
  if (!data) return <p className="text-ena-light/50">Veri yüklenemedi.</p>;

  const totalPages = Math.ceil((data.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Bakiye / Cari Hesap</h1>
          <p className="text-sm text-ena-light/50 mt-1">Güncel bakiye ve işlem geçmişiniz</p>
        </div>
        <Button onClick={exportPDF} variant="outline" className="gap-1.5 text-xs">
          <Download size={14} /> PDF İndir
        </Button>
      </div>

      {(data.pendingTopUps?.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <strong>Onay bekleyen bakiye:</strong>{" "}
          {formatPrice(data.pendingTopUpTotal || 0)}
          <ul className="mt-2 space-y-1 text-xs">
            {data.pendingTopUps.map((t: { id: string; amount: number; method: string; status: string }) => (
              <li key={t.id}>
                {formatPrice(t.amount)} — {t.method === "BANK_TRANSFER" ? "Havale" : "Kart"} ({t.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-ena-text">Bakiye Yükle</h2>
        <div className="flex flex-wrap gap-2">
          {(data.topUpSettings?.presets || [5000, 10000, 20000]).map((p: number) => (
            <button
              key={p}
              type="button"
              onClick={() => setTopUpAmount(p)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                topUpAmount === p ? "border-ena-primary bg-ena-primary/10" : "border-ena-border"
              }`}
            >
              {formatPrice(p)}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div>
            <label className="text-xs text-ena-light/50 block mb-1">Özel tutar (₺)</label>
            <input
              type="number"
              min={data.topUpSettings?.minAmount || 5000}
              step={100}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(Number(e.target.value))}
              className="rounded border border-ena-border bg-ena-dark px-3 py-2 text-sm w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={topUpLoading} onClick={() => startTopUp("CARD")}>
              {topUpLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <CreditCard size={14} className="mr-1" />}
              Kart ile Yükle
            </Button>
            {data.topUpSettings?.bankTransferEnabled !== false && (
              <Button variant="outline" disabled={topUpLoading} onClick={() => startTopUp("BANK_TRANSFER")}>
                Havale / EFT
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-ena-light/40">
          {data.topUpSettings?.belowMinMessage || "Minimum 5.000 ₺"}
          {data.topUpSettings?.pendingMessage ? ` · ${data.topUpSettings.pendingMessage}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ena-light/50">Bakiye</span>
            <Wallet size={18} className={data.balance < 0 ? "text-ena-primary" : "text-emerald-500"} />
          </div>
          <p className={`text-2xl font-bold ${data.balance < 0 ? "text-ena-primary" : "text-ena-text"}`}>{formatPrice(data.balance)}</p>
          {data.allowNegative && <p className="text-[10px] text-amber-600 mt-0.5">Açık hesap aktif</p>}
        </div>

        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ena-light/50">Kredi Limiti</span>
            <CreditCard size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-ena-text">{data.creditLimit > 0 ? formatPrice(data.creditLimit) : "—"}</p>
          {data.paymentTerm && <p className="text-[10px] text-ena-light/40 mt-0.5">{data.paymentTerm.days} gün vadeli, %{data.paymentTerm.rate} vade farkı</p>}
        </div>

        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ena-light/50">Kalan Kredi</span>
            <TrendingUp size={18} className="text-blue-500" />
          </div>
          <p className={`text-2xl font-bold ${data.creditLimit + data.balance < 0 ? "text-ena-primary" : "text-ena-text"}`}>
            {data.creditLimit > 0 ? formatPrice(Math.max(0, data.creditLimit + data.balance)) : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-ena-border bg-ena-card/30 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-ena-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base font-semibold text-ena-text">İşlem Geçmişi</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(0); }}
                  className="rounded border border-ena-border bg-ena-dark px-2 py-1.5 text-xs text-ena-text focus:outline-none"
                />
                <span className="text-ena-light/40 text-xs">-</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(0); }}
                  className="rounded border border-ena-border bg-ena-dark px-2 py-1.5 text-xs text-ena-text focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        {!data.transactions || data.transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-ena-light/40 text-sm">Henüz işlem yok</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ena-border">
                  {data.transactions.map((tx: any) => {
                    const isCredit = tx.credit > 0 || ["payment_credit", "return_credit", "PAYMENT", "REFUND", "MODULE_PAYMENT", "PRODUCT_PACKAGE_PAYMENT"].includes(tx.type);
                    return (
                      <tr key={tx.id} className="hover:bg-ena-card/40 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isCredit ? "bg-emerald-50" : "bg-ena-primary/5"}`}>
                              {isCredit ? <TrendingUp size={14} className="text-emerald-600" /> : <TrendingDown size={14} className="text-ena-primary" />}
                            </div>
                            <div>
                              <p className="font-medium text-ena-text">{TYPE_LABELS[tx.type] || tx.type}</p>
                              <p className="text-xs text-ena-light/40">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-ena-light/50 max-w-[200px] truncate">{tx.note}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`font-semibold ${isCredit ? "text-emerald-600" : "text-ena-primary"}`}>
                            {isCredit ? "+" : "−"}{formatPrice(tx.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-ena-light/40">
                          Bakiye: {formatPrice(tx.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-6 py-3 border-t border-ena-border">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs text-ena-light/50 hover:text-ena-text disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-ena-light/50">Sayfa {page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs text-ena-light/50 hover:text-ena-text disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
