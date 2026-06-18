"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Plus, Pencil, Trash2, X, Users as UsersIcon } from "lucide-react";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions";
import { Modal } from "@/components/ui/modal";

interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string;
  isSystem: boolean;
  _count: { users: number };
}

const PERM_GROUPS = [...new Set(Object.values(ALL_PERMISSIONS).map((p) => p.group))];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/admin/roles");
    const d = await res.json();
    setRoles(d.data || []);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", permissions: [] });
    setShowModal(true);
  };

  const openEdit = (role: AdminRole) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description,
      permissions: JSON.parse(role.permissions || "[]"),
    });
    setShowModal(true);
  };

  const togglePerm = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/roles/${editing.id}` : "/api/admin/roles";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      setToast({ type: "success", msg: editing ? "Rol güncellendi" : "Rol oluşturuldu" });
      setShowModal(false);
      fetchRoles();
    } else {
      setToast({ type: "error", msg: d.error || "Hata oluştu" });
    }
  };

  const handleDelete = async (role: AdminRole) => {
    if (role._count.users > 0) {
      setToast({ type: "error", msg: `${role._count.users} kullanıcı bu role sahip, önce rollerini değiştirin` });
      return;
    }
    if (!confirm(`"${role.name}" rolünü silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      setToast({ type: "success", msg: "Rol silindi" });
      fetchRoles();
    } else {
      setToast({ type: "error", msg: d.error || "Hata" });
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
          <h1 className="text-2xl font-bold text-gray-900">Roller</h1>
          <p className="text-sm text-gray-500 mt-1">{roles.length} rol tanımlı</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Rol Ekle
        </button>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => {
          const perms = JSON.parse(role.permissions || "[]");
          return (
            <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Shield size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {role.name}
                      {role.isSystem && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sistem</span>}
                    </h3>
                    {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <UsersIcon size={12} /> {role._count.users}
                  </span>
                  <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  {!role.isSystem && (
                    <button onClick={() => handleDelete(role)} className="p-1.5 rounded-lg hover:bg-ena-primary/5 text-gray-400 hover:text-ena-primary transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {perms.length === 0 ? (
                  <span className="text-xs text-gray-400">Yetki tanımlanmamış</span>
                ) : perms.length > 5 ? (
                  <>
                    {perms.slice(0, 5).map((p: string) => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {ALL_PERMISSIONS[p as PermissionKey]?.label || p}
                      </span>
                    ))}
                    <span className="text-xs text-purple-600">+{perms.length - 5} daha</span>
                  </>
                ) : (
                  perms.map((p: string) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {ALL_PERMISSIONS[p as PermissionKey]?.label || p}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && (
          <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <Shield size={40} className="mx-auto mb-2 text-gray-300" />
            <p>Henüz rol eklenmemiş</p>
          </div>
        )}
      </div>

      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Rol Düzenle" : "Yeni Rol"} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rol adı" required
                className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Açıklama"
                className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Yetkiler</p>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {PERM_GROUPS.map((group) => {
                  const groupPerms = Object.entries(ALL_PERMISSIONS).filter(([, v]) => v.group === group);
                  return (
                    <div key={group}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {groupPerms.map(([key, val]) => (
                          <label key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                            form.permissions.includes(key)
                              ? "bg-purple-50 border-purple-200 text-purple-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}>
                            <input type="checkbox" checked={form.permissions.includes(key)} onChange={() => togglePerm(key)}
                              className="sr-only" />
                            {val.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
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
