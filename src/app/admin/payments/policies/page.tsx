"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

type Policy = {
  id: string;
  scope: string;
  scopeKey: string;
  cardEnabled: boolean | null;
  bankTransferEnabled: boolean | null;
  balanceEnabled: boolean | null;
};

function TriStateSelect({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <select
      className="admin-input text-xs"
      value={value === null ? "inherit" : value ? "on" : "off"}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "inherit" ? null : v === "on");
      }}
    >
      <option value="inherit">Miras al</option>
      <option value="on">Açık</option>
      <option value="off">Kapalı</option>
    </select>
  );
}

export default function PaymentPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [groups, setGroups] = useState<{ name: string }[]>([]);
  const [dealers, setDealers] = useState<{ id: string; company: string; name: string; group: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    scope: "GLOBAL" as "GLOBAL" | "GROUP" | "DEALER",
    scopeKey: "",
    cardEnabled: null as boolean | null,
    bankTransferEnabled: null as boolean | null,
    balanceEnabled: null as boolean | null,
  });

  const load = () => {
    fetch("/api/admin/payments/policies")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPolicies(d.data.policies);
          setGroups(d.data.groups);
          setDealers(d.data.dealers);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/admin/payments/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Politika kaydedildi");
      load();
    } else toast.error(d.error || "Hata");
  };

  const remove = async (scope: string, scopeKey: string) => {
    if (!confirm("Bu politika silinsin mi?")) return;
    await fetch("/api/admin/payments/policies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, scopeKey }),
    });
    load();
  };

  if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ödeme Yöntemi Politikaları</h1>
        <p className="text-sm text-gray-500 mt-1">
          Öncelik: Bayi override → Grup → Global. Kart, Havale/EFT ve Bakiye yöntemlerini yönetin.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Politika Ekle / Güncelle</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <select className="admin-input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as typeof form.scope, scopeKey: "" })}>
            <option value="GLOBAL">Global (varsayılan)</option>
            <option value="GROUP">Bayi Grubu</option>
            <option value="DEALER">Tek Bayi</option>
          </select>
          {form.scope === "GROUP" && (
            <select className="admin-input" value={form.scopeKey} onChange={(e) => setForm({ ...form, scopeKey: e.target.value })}>
              <option value="">Grup seçin</option>
              {groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          )}
          {form.scope === "DEALER" && (
            <select className="admin-input" value={form.scopeKey} onChange={(e) => setForm({ ...form, scopeKey: e.target.value })}>
              <option value="">Bayi seçin</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.company} — {d.name}</option>)}
            </select>
          )}
          <div>
            <label className="text-xs text-gray-500">Kredi Kartı</label>
            <TriStateSelect value={form.cardEnabled} onChange={(v) => setForm({ ...form, cardEnabled: v })} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Havale/EFT</label>
            <TriStateSelect value={form.bankTransferEnabled} onChange={(v) => setForm({ ...form, bankTransferEnabled: v })} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Bakiye / Cari</label>
            <TriStateSelect value={form.balanceEnabled} onChange={(v) => setForm({ ...form, balanceEnabled: v })} />
          </div>
        </div>
        <Button onClick={save}>Kaydet</Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2">Kapsam</th>
              <th className="text-left px-4 py-2">Kart</th>
              <th className="text-left px-4 py-2">Havale</th>
              <th className="text-left px-4 py-2">Bakiye</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{p.scope}{p.scopeKey ? ` / ${p.scopeKey}` : ""}</td>
                <td className="px-4 py-2">{p.cardEnabled === null ? "—" : p.cardEnabled ? "✓" : "✗"}</td>
                <td className="px-4 py-2">{p.bankTransferEnabled === null ? "—" : p.bankTransferEnabled ? "✓" : "✗"}</td>
                <td className="px-4 py-2">{p.balanceEnabled === null ? "—" : p.balanceEnabled ? "✓" : "✗"}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" className="text-red-600 text-xs hover:underline" onClick={() => remove(p.scope, p.scopeKey)}>Sil</button>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz özel politika yok — gateway ayarları geçerli</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
