"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Shield, Loader2, UserPlus, Trash2, KeyRound, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { getStatusLabel } from "@/lib/modules/access";

type ModuleKey = "THYRONIX" | "HIVE" | "LINKSLASH" | "POD_CREATOR";

type Dealer = { id: string; company: string; name: string; email: string };
type Plan = { planKey: string; name: string; monthlyPrice: number };
type User = { id: string; email: string; name: string; role: string };
type AccessRow = {
  license: {
    id: string;
    dealerId: string;
    planKey: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  dealer: Dealer | null;
  users: User[];
  links: Array<{
    id: string;
    status: string;
    externalEmail: string;
    externalUsername: string;
    enaUser: User | null;
    lastLoginAt: string | null;
  }>;
};

export function AdminModuleAccessPanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dealerId, setDealerId] = useState("");
  const [userId, setUserId] = useState("");
  const [dealerUsers, setDealerUsers] = useState<User[]>([]);
  const [planKey, setPlanKey] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [createProductUser, setCreateProductUser] = useState(true);
  const [trialDays, setTrialDays] = useState(14);
  const [months, setMonths] = useState(moduleKey === "POD_CREATOR" ? 12 : 1);
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/module-access?moduleKey=${moduleKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setRows(d.data.rows || []);
        setDealers(d.data.dealers || []);
        setPlans(d.data.plans || []);
        setStatuses(d.data.statuses || []);
        setPlanKey((prev) => prev || d.data.plans?.[0]?.planKey || "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [moduleKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setMonths(moduleKey === "POD_CREATOR" ? 12 : 1);
  }, [moduleKey]);

  useEffect(() => {
    if (!dealerId) {
      setDealerUsers([]);
      setUserId("");
      return;
    }
    fetch(`/api/admin/module-access?dealerId=${dealerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDealerUsers(d.data.users || []);
          if (d.data.users?.[0]) setUserId(d.data.users[0].id);
        }
      });
  }, [dealerId]);

  const submit = async () => {
    if (!dealerId) return toast.error("Bayi seçin");
    if (!planKey) return toast.error("Paket seçin");
    if (createProductUser && !userId) return toast.error("Kullanıcı seçin veya ürün hesabı oluşturmayı kapatın");

    setSaving(true);
    setLastTempPassword(null);
    try {
      const res = await fetch("/api/admin/module-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerId,
          moduleKey,
          planKey,
          status,
          userId: createProductUser ? userId : undefined,
          createProductUser,
          trialDays: status === "TRIAL" ? trialDays : undefined,
          months: status === "ACTIVE" ? months : undefined,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Kaydedilemedi");

      if (d.data?.tempPassword) {
        setLastTempPassword(d.data.tempPassword);
        toast.success("Lisans tanımlandı — geçici şifre oluşturuldu");
      } else {
        toast.success(createProductUser ? "Lisans ve kullanıcı hesabı oluşturuldu" : "Lisans tanımlandı");
      }

      setDealerId("");
      setUserId("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  };

  const updateLicense = async (licenseId: string, patch: { status?: string; planKey?: string }) => {
    const res = await fetch(`/api/admin/module-licenses/${licenseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Güncellendi");
      load();
    } else toast.error(d.error || "Hata");
  };

  const removeLicense = async (licenseId: string) => {
    if (!confirm("Lisans kaldırılsın mı?")) return;
    const res = await fetch(`/api/admin/module-licenses/${licenseId}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      toast.success("Lisans kaldırıldı");
      load();
    } else toast.error(d.error || "Hata");
  };

  const createUserForRow = async (row: AccessRow, uid: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/module-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          dealerId: row.license.dealerId,
          moduleKey,
          userId: uid,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      if (d.data?.tempPassword) {
        setLastTempPassword(d.data.tempPassword);
        toast.success("Ürün hesabı oluşturuldu");
      } else {
        toast.success("Hesap bağlandı");
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <Shield size={18} className="text-purple-600" />
        <div>
          <h2 className="font-semibold text-gray-900">Lisans & Kullanıcı Yönetimi — {moduleKey}</h2>
          <p className="text-xs text-gray-500">Manuel lisans tanımla, paket seç, ürün hesabı oluştur</p>
        </div>
      </div>

      <div className="p-5 border-b border-gray-100 space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Bayi</label>
            <select
              value={dealerId}
              onChange={(e) => setDealerId(e.target.value)}
              className="admin-input w-full"
            >
              <option value="">Bayi seçin…</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company || d.name} — {d.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">ENA Kullanıcısı</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={!dealerId || !createProductUser}
              className="admin-input w-full disabled:opacity-50"
            >
              <option value="">{dealerId ? "Kullanıcı seçin…" : "Önce bayi seçin"}</option>
              {dealerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Paket</label>
            <select value={planKey} onChange={(e) => setPlanKey(e.target.value)} className="admin-input w-full">
              {plans.length === 0 ? (
                <option value="">Paket tanımlı değil</option>
              ) : (
                plans.map((p) => (
                  <option key={p.planKey} value={p.planKey}>
                    {p.name} ({p.planKey}) — ₺{p.monthlyPrice}/ay
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Lisans Durumu</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-input w-full">
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={createProductUser}
              onChange={(e) => setCreateProductUser(e.target.checked)}
            />
            {moduleKey} ürün hesabı oluştur / bağla
          </label>
          {status === "TRIAL" && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Deneme süresi (gün):
              <input
                type="number"
                min={1}
                max={90}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
                className="admin-input w-20"
              />
            </label>
          )}
          {status === "ACTIVE" && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Süre (ay):
              <input
                type="number"
                min={1}
                max={36}
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                className="admin-input w-20"
              />
            </label>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving || !planKey}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Lisans Tanımla
          </button>
        </div>

        {lastTempPassword && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900">
              <KeyRound size={16} />
              <span>
                Geçici şifre: <code className="font-mono font-bold">{lastTempPassword}</code>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(lastTempPassword);
                toast.success("Kopyalandı");
              }}
              className="text-xs px-2 py-1 border border-amber-300 rounded flex items-center gap-1"
            >
              <Copy size={12} /> Kopyala
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 font-medium">Bayi / Kullanıcı</th>
              <th className="px-5 py-3 font-medium">Paket</th>
              <th className="px-5 py-3 font-medium">Lisans</th>
              <th className="px-5 py-3 font-medium">{moduleKey} Hesabı</th>
              <th className="px-5 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  Henüz lisans tanımlı bayi yok
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.license.id} className="border-b border-gray-50 align-top">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">
                      {row.dealer?.company || row.dealer?.name || row.license.dealerId}
                    </div>
                    <div className="text-xs text-gray-500">{row.dealer?.email}</div>
                    {row.users.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {row.users.map((u) => (
                          <div key={u.id} className="text-xs text-gray-600">
                            {u.name} — {u.email}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={row.license.planKey}
                      onChange={(e) => updateLicense(row.license.id, { planKey: e.target.value })}
                      className="admin-input text-xs"
                    >
                      {plans.map((p) => (
                        <option key={p.planKey} value={p.planKey}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={row.license.status}
                      onChange={(e) => updateLicense(row.license.id, { status: e.target.value })}
                      className="admin-input text-xs"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {getStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                    {row.license.endsAt && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Bitiş: {new Date(row.license.endsAt).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {row.links.length === 0 ? (
                      <span className="text-xs text-gray-400">Hesap yok</span>
                    ) : (
                      row.links.map((link) => (
                        <div key={link.id} className="text-xs mb-1">
                          <span className="font-medium text-gray-800">{link.externalEmail}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded ${link.status === "LINKED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {link.status}
                          </span>
                        </div>
                      ))
                    )}
                    {row.users.some((u) => !row.links.find((l) => l.enaUser?.id === u.id)) && (
                      <div className="mt-2 space-y-1">
                        {row.users
                          .filter((u) => !row.links.find((l) => l.enaUser?.id === u.id))
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              disabled={saving}
                              onClick={() => createUserForRow(row, u.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <UserPlus size={12} /> {u.email} için hesap aç
                            </button>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeLicense(row.license.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                      title="Lisansı kaldır"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** @deprecated use AdminModuleAccessPanel */
export const AdminProductDealerLicenses = AdminModuleAccessPanel;
