"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Pencil, Trash2, X } from "lucide-react";

interface SubUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function DealerSubUsersPage() {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "orderer" });
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dealer/sub-users");
    setSubUsers((await res.json()).data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dealer/sub-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "orderer" });
      fetchData();
    } else {
      setError(d.error || "Hata");
    }
  };

  const toggleActive = async (sub: SubUser) => {
    await fetch("/api/dealer/sub-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sub.id, active: !sub.active }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kullanıcı silinsin mi?")) return;
    await fetch("/api/dealer/sub-users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ena-text">Alt Kullanıcılar</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-ena-primary text-white rounded-lg text-sm hover:brightness-90 transition-colors flex items-center gap-2">
          <Plus size={16} /> Yeni Kullanıcı
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-ena-card/30 border border-ena-border rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          {error && <p className="text-sm text-ena-primary">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad Soyad" required
              className="rounded-lg border border-ena-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ena-border" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-posta" required
              className="rounded-lg border border-ena-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ena-border" />
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Şifre" required
              className="rounded-lg border border-ena-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ena-border" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-lg border border-ena-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ena-border">
              <option value="orderer">Sipariş Verebilir</option>
              <option value="viewer">Sadece Görüntüleyici</option>
              <option value="admin">Tam Yetkili</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-ena-primary text-white rounded-lg text-sm hover:brightness-90 transition-colors">Oluştur</button>
        </form>
      )}

      <div className="bg-ena-card/30 border border-ena-border rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-ena-border">
          {subUsers.map((sub) => (
            <div key={sub.id} className={`p-4 flex items-center gap-4 ${!sub.active ? "opacity-50" : ""}`}>
              <div className={`p-2 rounded-lg ${sub.active ? "bg-blue-100" : "bg-ena-card/30"}`}>
                <Users size={18} className={sub.active ? "text-blue-600" : "text-ena-light/40"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ena-text">{sub.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    sub.role === "admin" ? "bg-purple-100 text-purple-700" :
                    sub.role === "orderer" ? "bg-blue-100 text-blue-700" : "bg-ena-card/30 text-ena-light/70"
                  }`}>
                    {sub.role === "admin" ? "Tam Yetkili" : sub.role === "orderer" ? "Siparişçi" : "İzleyici"}
                  </span>
                </div>
                <p className="text-xs text-ena-light/50">{sub.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(sub)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  sub.active ? "text-ena-primary border-red-200 hover:bg-ena-primary/5" : "text-green-600 border-green-200 hover:bg-green-50"
                }`}>
                  {sub.active ? "Devre Dışı" : "Aktif"}
                </button>
                <button onClick={() => handleDelete(sub.id)} className="text-ena-primary hover:text-ena-primary transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {subUsers.length === 0 && (
            <div className="text-center py-16 text-ena-light/40">
              <Users size={40} className="mx-auto mb-2 text-ena-light/30" />
              <p>Henüz alt kullanıcı yok</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
