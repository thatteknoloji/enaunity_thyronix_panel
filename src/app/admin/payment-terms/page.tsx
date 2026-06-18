"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Save } from "lucide-react";
import toast from "react-hot-toast";

interface PaymentTerm { id: string; days: number; rate: number; }
interface DealerTerm {
  id: string; company: string; name: string; group: string;
  paymentTerm: PaymentTerm | null;
}

export default function AdminPaymentTermsPage() {
  const [dealers, setDealers] = useState<DealerTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { days: number; rate: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch("/api/admin/payment-terms")
      .then((r) => r.json())
      .then((d) => {
        setDealers(d.data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = dealers.filter((d) =>
    d.company?.toLowerCase().includes(search.toLowerCase()) ||
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getEdit = (dealerId: string) => {
    if (edits[dealerId]) return edits[dealerId];
    const term = dealers.find((d) => d.id === dealerId)?.paymentTerm;
    return { days: term?.days ?? 0, rate: term?.rate ?? 0 };
  };

  const saveTerm = async (dealerId: string) => {
    setSaving(dealerId);
    const { days, rate } = getEdit(dealerId);
    const res = await fetch("/api/admin/payment-terms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId, days, rate }),
    });
    if (res.ok) {
      toast.success("Vade farkı kaydedildi");
      const newEdits = { ...edits };
      delete newEdits[dealerId];
      setEdits(newEdits);
      fetchData();
    } else {
      toast.error("Hata oluştu");
    }
    setSaving(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vade Farkı Yönetimi</h1>
        <p className="text-sm text-gray-500 mt-1">Bayilere özel vade günü ve vade farkı oranı belirleyin</p>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Bayi ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Bayi</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Grup</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600">Vade (Gün)</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600">Vade Farkı Oranı (%)</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((dealer) => {
                const edit = getEdit(dealer.id);
                return (
                  <tr key={dealer.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{dealer.company}</div>
                      <div className="text-xs text-gray-400">{dealer.name}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border border-gray-200 text-gray-500 capitalize">{dealer.group}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={edit.days}
                        onChange={(e) => setEdits({ ...edits, [dealer.id]: { ...edit, days: parseInt(e.target.value) || 0 } })}
                        className="w-20 text-center rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={edit.rate}
                          onChange={(e) => setEdits({ ...edits, [dealer.id]: { ...edit, rate: parseFloat(e.target.value) || 0 } })}
                          className="w-20 text-center rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
                        />
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => saveTerm(dealer.id)}
                        disabled={saving === dealer.id}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Save size={13} />
                        {saving === dealer.id ? "..." : "Kaydet"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Bayi bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
