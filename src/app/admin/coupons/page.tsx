"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Tag, Plus, X } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minAmount: number;
  maxDiscount: number;
  usageLimit: number;
  usageCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "", type: "percentage", value: 0, minAmount: 0, maxDiscount: 0, usageLimit: 0, expiresAt: "",
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
    setCoupons((await res.json()).data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (coupon: Coupon) => {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
    });
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ code: "", type: "percentage", value: 0, minAmount: 0, maxDiscount: 0, usageLimit: 0, expiresAt: "" });
    fetchData();
  };

  const expired = (c: Coupon) => c.expiresAt && new Date(c.expiresAt) < new Date();
  const exhausted = (c: Coupon) => c.usageLimit > 0 && c.usageCount >= c.usageLimit;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kuponlar</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Yeni Kupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="KOD20" required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="percentage">Yüzde İndirim</option>
              <option value="fixed">Sabit Tutar</option>
            </select>
            <input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} placeholder={form.type === "percentage" ? "% değer" : "TL değer"}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input type="number" min={0} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: parseFloat(e.target.value) || 0 })} placeholder="Min. sepet (0=şartsız)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: parseFloat(e.target.value) || 0 })} placeholder="Max indirim (0=sınırsız)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) || 0 })} placeholder="Kullanım limiti (0=sınırsız)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Kaydet</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {coupons.map((c) => {
            const isExpired = expired(c);
            const isExhausted = exhausted(c);
            const isInvalid = isExpired || isExhausted || !c.active;
            return (
              <div key={c.id} className={`p-4 flex items-center gap-4 ${isInvalid ? "opacity-50" : ""}`}>
                <div className={`p-2 rounded-lg ${c.active ? "bg-emerald-100" : "bg-gray-100"}`}>
                  <Tag size={18} className={c.active ? "text-emerald-600" : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-900">{c.code}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.type === "percentage" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {c.type === "percentage" ? `%${c.value}` : `${c.value} TL`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.minAmount > 0 && `Min: ${c.minAmount} TL`}
                    {c.maxDiscount > 0 && ` · Maks: ${c.maxDiscount} TL`}
                    {c.usageLimit > 0 && ` · Kullanım: ${c.usageCount}/${c.usageLimit}`}
                    {isExpired && " · Süresi dolmuş"}
                    {isExhausted && " · Limit dolmuş"}
                  </p>
                  {c.expiresAt && <p className="text-xs text-gray-400">Bitiş: {formatDate(c.expiresAt)}</p>}
                </div>
                <button onClick={() => toggleActive(c)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.active ? "text-ena-primary border-red-200 hover:bg-ena-primary/5" : "text-green-600 border-green-200 hover:bg-green-50"}`}>
                  {c.active ? "Devre Dışı" : "Aktifleştir"}
                </button>
              </div>
            );
          })}
          {coupons.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-2 text-gray-300" />
              <p>Henüz kupon yok</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
