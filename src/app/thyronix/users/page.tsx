"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserCog, Pencil, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { ThyronixTeamMember, ThyronixTeamRole } from "@/lib/thyronix/commercial";
import { THYRONIX_TEAM_ROLES } from "@/lib/thyronix/commercial";

const ROLE_META: Record<ThyronixTeamRole, { icon: typeof Shield; desc: string; color: string }> = {
  OWNER: { icon: Shield, desc: "Tam yetki: ekip, kaynaklar, feedler, faturalama", color: "text-nexa-primary" },
  MANAGER: { icon: UserCog, desc: "Kaynak ve feed yönetimi, ekip daveti", color: "text-nexa-warning" },
  EDITOR: { icon: Pencil, desc: "Ürün düzenleme, kural ve feed yayınlama", color: "text-nexa-success" },
  VIEWER: { icon: Eye, desc: "Salt okunur: dashboard ve raporlar", color: "text-nexa-text-secondary" },
};

export default function ThyronixUsersPage() {
  const [team, setTeam] = useState<ThyronixTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiUser, setMultiUser] = useState(false);
  const [planKey, setPlanKey] = useState("starter");
  const [form, setForm] = useState({ email: "", name: "", role: "EDITOR" as ThyronixTeamRole });
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    fetch("/api/thyronix/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTeam(d.data.team || []);
          setMultiUser(d.data.limits?.multiUser ?? false);
          setPlanKey(d.data.planKey);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveTeam = async (next: ThyronixTeamMember[]) => {
    const res = await fetch("/api/thyronix/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: next }),
    });
    const d = await res.json();
    if (d.success) {
      setTeam(next);
      toast.success("Ekip güncellendi");
    } else toast.error(d.error || "Hata");
  };

  const addMember = async () => {
    if (!form.email.trim()) return toast.error("E-posta gerekli");
    const member: ThyronixTeamMember = {
      id: crypto.randomUUID(),
      email: form.email.trim(),
      name: form.name.trim() || form.email.split("@")[0],
      role: form.role,
      active: true,
    };
    await saveTeam([...team, member]);
    setForm({ email: "", name: "", role: "EDITOR" });
    setShowForm(false);
  };

  const removeMember = async (id: string) => {
    if (!confirm("Üye kaldırılsın mı?")) return;
    await saveTeam(team.filter((m) => m.id !== id));
  };

  if (!multiUser && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-nexa-text">Ekip & Roller</h1>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-10 text-center">
          <Users size={40} className="mx-auto text-nexa-primary/30 mb-3" />
          <p className="text-nexa-text font-medium">Çoklu kullanıcı {planKey} paketinde kullanılamaz</p>
          <p className="text-sm text-nexa-text-secondary mt-2">Professional veya Enterprise plana yükseltin.</p>
          <a href="/thyronix/pricing" className="inline-block mt-4 text-sm text-nexa-primary hover:underline">Paketleri Gör</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Ekip & Roller</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">OWNER, MANAGER, EDITOR ve VIEWER rolleri</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-nexa-primary text-white text-sm font-semibold">
          <Plus size={16} /> Üye Ekle
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {THYRONIX_TEAM_ROLES.map((role) => {
          const meta = ROLE_META[role];
          return (
            <div key={role} className="flex items-center gap-4 p-4 rounded-xl border border-nexa-border bg-nexa-card">
              <meta.icon size={20} className={meta.color} />
              <div>
                <p className="text-sm font-medium text-nexa-text">{role}</p>
                <p className="text-xs text-nexa-text-secondary">{meta.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-3">
          <input className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ThyronixTeamRole })}>
            {THYRONIX_TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={addMember} className="px-4 py-2 rounded-lg bg-nexa-primary text-white text-sm">Ekle</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-nexa-border text-sm text-nexa-text-secondary">İptal</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexa-border bg-nexa-bg/50">
              <th className="px-4 py-3 text-left text-nexa-text-secondary">Kullanıcı</th>
              <th className="px-4 py-3 text-left text-nexa-text-secondary">Rol</th>
              <th className="px-4 py-3 text-left text-nexa-text-secondary">Durum</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>
            ) : team.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-nexa-text-secondary">Henüz ekip üyesi yok. İlk üyeyi ekleyin.</td></tr>
            ) : (
              team.map((u) => (
                <tr key={u.id} className="hover:bg-nexa-hover">
                  <td className="px-4 py-3">
                    <p className="text-nexa-text">{u.name}</p>
                    <p className="text-xs text-nexa-text-secondary">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-nexa-primary/10 text-nexa-primary px-2 py-0.5 rounded">{u.role}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-nexa-success">{u.active ? "Aktif" : "Pasif"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeMember(u.id)} className="p-2 rounded-lg hover:bg-nexa-danger/10 text-nexa-danger"><Trash2 size={14} /></button>
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
