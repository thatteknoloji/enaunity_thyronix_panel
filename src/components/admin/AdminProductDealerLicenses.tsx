"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Shield, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type Dealer = { id: string; company: string; name: string; email: string };
type License = { id: string; dealerId: string; moduleKey: string; planKey: string; status: string };

const PLANS: Record<string, string[]> = {
  THYRONIX: ["starter", "professional", "enterprise"],
  HIVE: ["starter", "professional", "enterprise"],
};

export function AdminProductDealerLicenses({ moduleKey }: { moduleKey: "THYRONIX" | "HIVE" }) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealerId, setDealerId] = useState("");
  const [planKey, setPlanKey] = useState(PLANS[moduleKey][0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/dealers").then((r) => r.json()),
      fetch(`/api/admin/module-licenses?moduleKey=${moduleKey}`).then((r) => r.json()),
    ])
      .then(([dd, ld]) => {
        if (dd.success) setDealers(dd.data || []);
        if (ld.success) setLicenses(ld.data?.items || ld.data || []);
      })
      .finally(() => setLoading(false));
  }, [moduleKey]);

  useEffect(() => { load(); }, [load]);

  const dealerMap = Object.fromEntries(dealers.map((d) => [d.id, d]));

  const addLicense = async () => {
    if (!dealerId) return toast.error("Bayi seçin");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/module-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId, moduleKey, planKey, status: "ACTIVE" }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Bayi eklendi");
        setDealerId("");
        load();
      } else toast.error(d.error || "Eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  const removeLicense = async (id: string) => {
    if (!confirm("Bu bayinin lisansı kaldırılsın mı?")) return;
    const res = await fetch(`/api/admin/module-licenses/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { toast.success("Kaldırıldı"); load(); } else toast.error(d.error || "Hata");
  };

  const toggleActive = async (lic: License) => {
    const next = lic.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/admin/module-licenses/${lic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await res.json();
    if (d.success) { toast.success("Güncellendi"); load(); } else toast.error(d.error || "Hata");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Shield size={18} className="text-purple-600" />
        <h2 className="font-semibold text-gray-900 dark:text-white">Bayi Lisans Yönetimi — {moduleKey}</h2>
      </div>

      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Bayi</label>
          <select
            value={dealerId}
            onChange={(e) => setDealerId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          >
            <option value="">Bayi seçin…</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>{d.company || d.name} — {d.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Paket</label>
          <select value={planKey} onChange={(e) => setPlanKey(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
            {PLANS[moduleKey].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button
          onClick={addLicense}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <Plus size={14} /> Bayi Ekle
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="px-5 py-3 font-medium">Bayi</th>
              <th className="px-5 py-3 font-medium">Paket</th>
              <th className="px-5 py-3 font-medium">Durum</th>
              <th className="px-5 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {licenses.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Henüz lisanslı bayi yok</td></tr>
            ) : (
              licenses.map((lic) => {
                const d = dealerMap[lic.dealerId];
                return (
                  <tr key={lic.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{d?.company || d?.name || lic.dealerId}</div>
                      <div className="text-xs text-gray-500">{d?.email}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{lic.planKey || "—"}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleActive(lic)} className={`text-xs px-2 py-0.5 rounded font-medium ${lic.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {lic.status}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => removeLicense(lic.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Kaldır">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
