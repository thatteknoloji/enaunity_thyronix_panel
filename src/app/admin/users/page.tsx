"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Users, Shield, X, Plus, Pencil, UserCog } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface AdminRole {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  adminRoleId: string | null;
  adminRole: { id: string; name: string } | null;
  createdAt: string;
  _count: { orders: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [tab, setTab] = useState<"all" | "admins">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", adminRoleId: "" });
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [uRes, rRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/roles"),
    ]);
    const u = await uRes.json();
    const r = await rRes.json();
    setUsers(u.data || []);
    setAdminRoles(r.data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredUsers = tab === "admins" ? users.filter((u) => u.role === "admin") : users;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "admin", adminRoleId: adminRoles[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({
      name: user.name, email: user.email, password: "",
      role: user.role, adminRoleId: user.adminRoleId || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? "/api/admin/users" : "/api/admin/users";
    const method = editing ? "PUT" : "POST";
    const body: any = { ...form };
    if (editing) body.id = editing.id;
    if (!body.password && editing) delete body.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) {
      setToast({ type: "success", msg: editing ? "Kullanıcı güncellendi" : "Kullanıcı oluşturuldu" });
      setShowModal(false);
      fetchData();
    } else {
      setToast({ type: "error", msg: d.error || "Hata oluştu" });
    }
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {users.length} kullanıcı, {users.filter((u) => u.role === "admin").length} admin</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Admin Ekle
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("all")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Tümü
        </button>
        <button onClick={() => setTab("admins")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === "admins" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Adminler
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Ad Soyad</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">E-posta</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Rol</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Admin Rolü</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Sipariş</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Kayıt</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                {tab === "admins" ? "Henüz admin kullanıcı yok" : "Henüz kullanıcı yok"}
              </td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        user.role === "admin" ? "bg-gradient-to-br from-purple-600 to-indigo-500" : "bg-gradient-to-br from-gray-600 to-gray-400"
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3.5">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        <Shield size={10} /> Admin
                      </span>
                    ) : user.role === "dealer" ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Bayi
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Kullanıcı
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.adminRole ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{user.adminRole.name}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{user._count.orders}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {user.role === "admin" && (
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Admin Düzenle" : "Yeni Admin Ekle"} icon={<UserCog size={18} className="text-purple-600" />}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad Soyad" required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-posta" required type="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Yeni şifre (boş bırakınca değişmez)" : "Şifre (min 6 karakter)"} type="password"
              required={!editing} minLength={editing ? undefined : 6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <select value={form.adminRoleId} onChange={(e) => setForm({ ...form, adminRoleId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Rol seçin</option>
              {adminRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
                {editing ? "Güncelle" : "Oluştur"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">İptal</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
