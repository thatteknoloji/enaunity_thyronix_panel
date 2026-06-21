"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Key, Plus } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Code = {
  id: string;
  code: string;
  durationDays: number;
  status: string;
  usedByUserId: string;
  usedAt: string | null;
  createdAt: string;
};

export default function AdminLinkSlashActivationPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/linkslash/activation");
    const d = await r.json();
    if (d.success) setCodes(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    const r = await fetch("/api/admin/linkslash/activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, durationDays: days }),
    });
    const d = await r.json();
    if (d.success) load();
    else alert(d.error);
  }

  async function revoke(id: string) {
    await fetch("/api/admin/linkslash/activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", id }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin/linkslash")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aktivasyon Kodları</h1>
          <p className="text-sm text-gray-500">Format: LS-XXXX-XXXX-XXXX</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-end rounded-xl border bg-white p-4">
        <label className="text-sm">Adet<input type="number" min={1} max={50} value={count} onChange={(e) => setCount(+e.target.value)} className="mt-1 block w-20 rounded border px-2 py-1" /></label>
        <label className="text-sm">Süre (gün)<input type="number" value={days} onChange={(e) => setDays(+e.target.value)} className="mt-1 block w-24 rounded border px-2 py-1" /></label>
        <button type="button" onClick={generate} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"><Plus size={14} /> Kod Üret</button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Kod</th>
              <th className="px-4 py-2 text-left">Süre</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Kullanım</th>
              <th className="px-4 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="p-6 text-gray-400">Yükleniyor…</td></tr> : codes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">{c.durationDays} gün</td>
                <td className="px-4 py-3">{c.status}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.usedAt ? new Date(c.usedAt).toLocaleString("tr-TR") : "—"}</td>
                <td className="px-4 py-3 text-right">{c.status === "active" && <button type="button" onClick={() => revoke(c.id)} className="text-red-500 text-xs">İptal</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
