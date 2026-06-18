"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CreditCard, Receipt, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { downloadInvoicePdf, buildInvoicePdfData } from "@/lib/invoices/invoice-pdf";

type Tab = "invoices" | "payments" | "statements";

const paymentBadge: Record<string, "default" | "success" | "warning" | "danger"> = {
  UNPAID: "warning",
  PARTIAL: "default",
  PAID: "success",
  REFUNDED: "danger",
};

export default function DealerInvoicesPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [legacyOrders, setLegacyOrders] = useState<any[]>([]);
  const [legacyPdfEnabled, setLegacyPdfEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dealer/invoices?tab=${tab}`);
      const d = await res.json();
      if (d.success) {
        if (tab === "invoices") setInvoices(d.data);
        if (tab === "payments") setPayments(d.data);
        if (tab === "statements") setStatements(d.data);
        if (d.legacyOrderPdfEnabled) {
          setLegacyPdfEnabled(true);
          const ordRes = await fetch("/api/dealer/orders");
          const ordData = await ordRes.json();
          setLegacyOrders((ordData.data || []).filter((o: any) => o.status !== "cancelled"));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const generateStatement = async () => {
    const now = new Date();
    const res = await fetch("/api/dealer/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_statement", year: now.getFullYear(), month: now.getMonth() + 1 }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Ekstre oluşturuldu");
      load();
    } else toast.error(d.error || "Hata");
  };

  const downloadLegacyOrderPdf = async (order: any) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 20;
      let y = 20;
      doc.setFontSize(16);
      doc.setTextColor(229, 9, 20);
      doc.text("ENAUNITY", margin, y);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text("Legacy Order PDF", margin, (y += 5));
      doc.text(`INV-${order.id.slice(0, 8).toUpperCase()}`, margin, (y += 5));
      doc.save(`INV-${order.id.slice(0, 8).toUpperCase()}.pdf`);
      toast.success("Legacy PDF indirildi");
    } catch {
      toast.error("PDF oluşturulamadı");
    }
  };

  const tabs = [
    { id: "invoices" as Tab, label: "Faturalar", icon: FileText },
    { id: "payments" as Tab, label: "Ödemeler", icon: CreditCard },
    { id: "statements" as Tab, label: "Ekstreler", icon: Receipt },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Fatura Merkezi</h1>
          <p className="text-sm text-ena-light/50">Faturalar, ödemeler ve ekstreler</p>
        </div>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} className="mr-1" />Yenile</Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-ena-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? "border-ena-primary text-ena-primary" : "border-transparent text-ena-light/50"
            }`}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse h-64 rounded bg-ena-card/50" />
      ) : tab === "invoices" ? (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ena-border rounded-xl">
              <FileText size={40} className="mx-auto text-ena-light/30" />
              <p className="mt-3 text-ena-light/50">Henüz fatura yok</p>
            </div>
          ) : (
            <div className="rounded-xl border border-ena-border bg-ena-card/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ena-card/20 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ena-light/70 uppercase">Fatura No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ena-light/70 uppercase">Kaynak</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ena-light/70 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ena-light/70 uppercase">Tutar</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-ena-light/70 uppercase">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ena-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-ena-card/40">
                      <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                      <td className="px-4 py-3 text-xs">{inv.sourceType}</td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentBadge[inv.paymentStatus] || "default"}>{inv.paymentStatus}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(inv.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(buildInvoicePdfData(inv))}>
                          <Download size={14} className="mr-1" />PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {legacyPdfEnabled && legacyOrders.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold text-amber-600 mb-2">Legacy Order PDF (compatibility)</p>
              <div className="space-y-1">
                {legacyOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex justify-between items-center text-sm">
                    <span className="font-mono text-xs">INV-{o.id.slice(0, 8).toUpperCase()}</span>
                    <Button size="sm" variant="ghost" onClick={() => downloadLegacyOrderPdf(o)}>Legacy PDF</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : tab === "payments" ? (
        payments.length === 0 ? (
          <p className="text-center py-12 text-ena-light/50">Ödeme kaydı yok</p>
        ) : (
          <div className="rounded-xl border border-ena-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ena-card/20"><tr>
                <th className="px-4 py-3 text-left text-xs uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs uppercase">Fatura</th>
                <th className="px-4 py-3 text-right text-xs uppercase">Tutar</th>
              </tr></thead>
              <tbody className="divide-y divide-ena-border">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-xs">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.invoice?.number}</td>
                    <td className="px-4 py-3 text-right text-green-500 font-semibold">{formatPrice(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : statements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-ena-light/50 mb-4">Henüz ekstre yok</p>
          <Button onClick={generateStatement}>Bu Ay Ekstre Oluştur</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-ena-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ena-card/20"><tr>
              <th className="px-4 py-3 text-left text-xs uppercase">Dönem</th>
              <th className="px-4 py-3 text-right text-xs uppercase">Borç</th>
              <th className="px-4 py-3 text-right text-xs uppercase">Alacak</th>
              <th className="px-4 py-3 text-right text-xs uppercase">Bakiye</th>
            </tr></thead>
            <tbody className="divide-y divide-ena-border">
              {statements.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.periodMonth}/{s.periodYear}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(s.totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-green-500">{formatPrice(s.totalCredit)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPrice(s.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
