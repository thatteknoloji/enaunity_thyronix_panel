"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus, ArrowLeft, FileText, RefreshCw, CreditCard, Receipt, AlertTriangle, BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import { downloadInvoicePdf } from "@/lib/invoices/invoice-pdf";
import { buildInvoicePdfData } from "@/lib/invoices/invoice-pdf";

type Tab = "invoices" | "payments" | "statements" | "overdue" | "reports";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  return res.json();
}

const paymentStatusColors: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export default function AdminInvoicesPage() {
  return (
    <Suspense fallback={<p className="text-center py-12 text-gray-400">Yükleniyor…</p>}>
      <AdminInvoicesContent />
    </Suspense>
  );
}

function AdminInvoicesContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "invoices";
  const [tab, setTab] = useState<Tab>(["invoices", "payments", "statements", "overdue", "reports"].includes(initialTab) ? initialTab : "invoices");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, dataRes] = await Promise.all([
        api("/api/admin/invoices/financial?tab=summary"),
        api(`/api/admin/invoices/financial?tab=${tab}`),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (dataRes.success) {
        if (tab === "invoices") setInvoices(dataRes.data);
        if (tab === "payments") setPayments(dataRes.data);
        if (tab === "statements") setStatements(dataRes.data);
        if (tab === "overdue") setOverdue(dataRes.data);
        if (tab === "reports") setReports(dataRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const recordPayment = async (invoiceId: string, amount: number) => {
    const res = await api("/api/admin/invoices/financial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record_payment", invoiceId, amount }),
    });
    if (res.success) {
      toast.success("Ödeme kaydedildi");
      load();
    } else toast.error(res.error || "Hata");
  };

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "invoices", label: "Faturalar", icon: FileText },
    { id: "payments", label: "Ödemeler", icon: CreditCard },
    { id: "statements", label: "Ekstreler", icon: Receipt },
    { id: "overdue", label: "Gecikmiş", icon: AlertTriangle },
    { id: "reports", label: "Raporlar", icon: BarChart3 },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finans Merkezi</h1>
          <p className="mt-1 text-sm text-gray-500">Invoice → Payment → Cari → Ekstre zinciri</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} className="mr-1" />Yenile</Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Fatura", value: summary.invoiceCount },
            { label: "Ödeme", value: summary.paymentCount },
            { label: "Ekstre", value: summary.statementCount },
            { label: "Gecikmiş", value: summary.overdueCount, warn: true },
            { label: "Açık Tutar", value: `₺${(summary.unpaidTotal || 0).toFixed(0)}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className={`text-2xl font-bold ${s.warn ? "text-amber-600" : "text-gray-900"}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 uppercase font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-ena-primary text-ena-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Yükleniyor...</p>
      ) : tab === "invoices" ? (
        <InvoiceTable invoices={invoices} onPay={recordPayment} />
      ) : tab === "payments" ? (
        <PaymentsTable payments={payments} />
      ) : tab === "statements" ? (
        <>
          <p className="text-xs text-gray-500 mb-3">Bayi aylık ekstreleri — eski Operasyon Merkezi ekstre sekmesi buraya taşındı.</p>
          <StatementsTable statements={statements} />
        </>
      ) : tab === "overdue" ? (
        <InvoiceTable invoices={overdue} onPay={recordPayment} overdue />
      ) : (
        <ReportsPanel reports={reports} />
      )}
    </div>
  );
}

function InvoiceTable({ invoices, onPay, overdue }: { invoices: any[]; onPay: (id: string, amount: number) => void; overdue?: boolean }) {
  if (!invoices.length) {
    return <p className="text-center py-12 text-gray-400">{overdue ? "Gecikmiş fatura yok" : "Fatura bulunamadı"}</p>;
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fatura</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kaynak</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ödeme</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tutar</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <p className="font-mono font-medium">{inv.number}</p>
                {inv.order?.orderNumber && <p className="text-[10px] text-gray-400">Sip: {inv.order.orderNumber}</p>}
              </td>
              <td className="px-4 py-3">{inv.dealer?.company || inv.dealer?.name || "—"}</td>
              <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{inv.sourceType}</span></td>
              <td className="px-4 py-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${paymentStatusColors[inv.paymentStatus] || "bg-gray-100"}`}>
                  {inv.paymentStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold">₺{inv.total.toFixed(2)}</td>
              <td className="px-4 py-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(buildInvoicePdfData(inv))}>PDF</Button>
                {inv.paymentStatus !== "PAID" && (
                  <Button size="sm" variant="ghost" className="text-green-600" onClick={() => onPay(inv.id, inv.total - inv.paidAmount)}>
                    Öde
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: any[] }) {
  if (!payments.length) return <p className="text-center py-12 text-gray-400">Ödeme kaydı yok</p>;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Tarih</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Fatura</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Bayi</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Tutar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-xs">{new Date(p.createdAt).toLocaleDateString("tr-TR")}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.invoice?.number || "—"}</td>
              <td className="px-4 py-3">{p.dealer?.company || p.dealer?.name}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-600">₺{p.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementsTable({ statements }: { statements: any[] }) {
  if (!statements.length) return <p className="text-center py-12 text-gray-400">Ekstre yok</p>;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Dönem</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Bayi</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Borç</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Alacak</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Kapanış</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {statements.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">{s.periodMonth}/{s.periodYear}</td>
              <td className="px-4 py-3">{s.dealer?.company || s.dealer?.name}</td>
              <td className="px-4 py-3 text-right">₺{s.totalDebit.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-green-600">₺{s.totalCredit.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-semibold">₺{s.closingBalance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPanel({ reports }: { reports: any }) {
  if (!reports) return <p className="text-center py-12 text-gray-400">Rapor verisi yok</p>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold mb-4">Kaynak Dağılımı</h3>
        {(reports.bySource || []).map((r: any) => (
          <div key={r.sourceType} className="flex justify-between py-2 border-b border-gray-50 text-sm">
            <span>{r.sourceType}</span>
            <span>{r._count} fatura — ₺{(r._sum?.total || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold mb-4">Ödeme Durumu</h3>
        {(reports.byPayment || []).map((r: any) => (
          <div key={r.paymentStatus} className="flex justify-between py-2 border-b border-gray-50 text-sm">
            <span>{r.paymentStatus}</span>
            <span>{r._count} — ₺{(r._sum?.total || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
