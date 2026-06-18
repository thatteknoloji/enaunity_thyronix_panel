"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { Plus, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("payment");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch("/api/admin/payments"),
      fetch("/api/admin/dealers"),
    ]);
    const pData = await pRes.json();
    const dData = await dRes.json();
    if (pData.success) setPayments(pData.data);
    if (dData.success) setDealers(dData.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter((p) =>
    p.dealer?.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerId || !amount) return;
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, orderId: orderId || null, amount, type, note }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Ödeme kaydedildi");
      setShowForm(false);
      setDealerId("");
      setOrderId("");
      setAmount("");
      setNote("");
      load();
    } else {
      toast.error(d.error || "Hata");
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-200" /><div className="h-64 rounded bg-gray-200" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
          <p className="text-sm text-gray-500 mt-1">Bayi ödemelerini yönetin</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus size={15} /> {showForm ? "İptal" : "Yeni Ödeme"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Yeni Ödeme Kaydı</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bayi *</label>
              <select value={dealerId} onChange={(e) => setDealerId(e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none">
                <option value="">Bayi seçin</option>
                {dealers.map((d: any) => <option key={d.id} value={d.id}>{d.company} - {d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (TL) *</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none">
                <option value="payment">Ödeme</option>
                <option value="refund">İade</option>
                <option value="adjustment">Düzeltme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sipariş No (opsiyonel)</label>
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none" />
            </div>
          </div>
          <Button type="submit">Kaydet</Button>
        </form>
      )}

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Bayi ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Bayi</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Tür</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Tutar</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Açıklama</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/80">
                <td className="px-5 py-3 font-medium text-gray-900">{p.dealer?.company || "-"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${p.type === "payment" ? "bg-emerald-100 text-emerald-700" : p.type === "refund" ? "bg-ena-primary/10 text-ena-primary" : "bg-amber-100 text-amber-700"}`}>
                    {p.type === "payment" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {p.type === "payment" ? "Ödeme" : p.type === "refund" ? "İade" : "Düzeltme"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">{formatPrice(p.amount)}</td>
                <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{p.note || "-"}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Ödeme bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
