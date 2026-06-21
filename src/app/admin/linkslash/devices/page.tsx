"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Device = {
  id: string;
  userId: string;
  dealerId: string;
  deviceId: string;
  deviceName: string;
  androidId: string;
  status: string;
  firstLoginAt: string;
  lastSeenAt: string;
};

export default function AdminLinkSlashDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/linkslash/devices");
    const d = await r.json();
    if (d.success) setDevices(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function revoke(id: string) {
    await fetch(`/api/admin/linkslash/devices/${id}`, { method: "PATCH" });
    load();
  }

  async function resetUser(userId: string) {
    if (!confirm("Bu kullanıcının tüm cihazları sıfırlansın mı?")) return;
    await fetch("/api/admin/linkslash/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", userId }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Cihaz kaydı silinsin mi?")) return;
    await fetch(`/api/admin/linkslash/devices/${id}`, { method: "DELETE" });
    load();
  }

  const byUser = devices.reduce<Record<string, Device[]>>((acc, d) => {
    (acc[d.userId] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin/linkslash")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Smartphone size={20} /> Cihaz Yönetimi</h1>
          <p className="text-sm text-gray-500">Device binding — max_devices lisans metadata içinde</p>
        </div>
      </div>

      {loading ? <p className="text-gray-400">Yükleniyor…</p> : (
        <div className="space-y-4">
          {Object.entries(byUser).map(([userId, list]) => (
            <div key={userId} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <span className="text-xs font-mono">{userId}</span>
                <button type="button" onClick={() => resetUser(userId)} className="text-xs text-amber-700">Tüm cihazları sıfırla</button>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {list.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2">{d.deviceName || "Android"}</td>
                      <td className="px-4 py-2 text-xs font-mono">{d.deviceId.slice(0, 12)}…</td>
                      <td className="px-4 py-2">{d.status}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(d.lastSeenAt).toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        {d.status === "active" && <button type="button" onClick={() => revoke(d.id)} className="text-xs text-amber-600">Kaldır</button>}
                        <button type="button" onClick={() => remove(d.id)} className="text-xs text-red-500">Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {!devices.length && <p className="text-gray-400 text-center py-8">Kayıtlı cihaz yok</p>}
        </div>
      )}
    </div>
  );
}
