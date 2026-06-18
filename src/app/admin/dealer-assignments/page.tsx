"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Trash2, Users, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Dealer {
  id: string;
  name: string;
  company: string;
  group: string;
}

interface Assignment {
  id: string;
  adminId: string;
  adminName: string;
  dealerId: string;
  dealer: Dealer;
  createdAt: string;
}

export default function DealerAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ adminId: "", adminName: "", dealerId: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dealer-assignments").then(r => r.json()),
      fetch("/api/admin/dealers").then(r => r.json()),
      fetch("/api/admin/users").then(r => r.json()),
    ]).then(([a, d, u]) => {
      if (a.success) setAssignments(a.data);
      if (d.success) setDealers(d.data);
      if (u.success) setAdmins(u.data.filter((u: any) => u.role === "admin"));
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.adminId || !form.dealerId) { toast.error("Tüm alanları doldurun"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/dealer-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Atama yapıldı");
      setAssignments(prev => [d.data, ...prev]);
      setShowModal(false);
      setForm({ adminId: "", adminName: "", dealerId: "" });
    } else toast.error(d.error);
    setSaving(false);
  };

  const handleRemove = async (adminId: string, dealerId: string) => {
    if (!confirm("Atamayı kaldır?")) return;
    const res = await fetch("/api/admin/dealer-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, dealerId }),
    });
    if (res.ok) {
      setAssignments(prev => prev.filter(a => !(a.adminId === adminId && a.dealerId === dealerId)));
      toast.success("Atama kaldırıldı");
    }
  };

  const filtered = assignments.filter(a =>
    a.dealer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.dealer?.company?.toLowerCase().includes(search.toLowerCase()) ||
    a.adminName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-100"/><div className="h-64 rounded bg-gray-100"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satış Temsilcisi Atamaları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Admin kullanıcılarına bayi atayarak satış temsilcisi panelleri oluşturun</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus size={16} /> Yeni Atama</Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Bayi veya temsilci ara..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm bg-white text-gray-900 focus:outline-none focus:border-red-400" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Users size={48} className="mx-auto text-gray-200" />
          <p className="mt-3 text-gray-500">Henüz atama yapılmamış</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{a.dealer?.name || "?"}</p>
                  <p className="text-xs text-gray-500">{a.dealer?.company} · {a.dealer?.group}</p>
                  <p className="text-[10px] text-gray-400">Temsilci: {a.adminName || a.adminId}</p>
                </div>
              </div>
              <button onClick={() => handleRemove(a.adminId, a.dealerId)} className="p-2 rounded-lg text-gray-400 hover:text-ena-primary transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yeni Atama" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">Satış Temsilcisi (Admin)</label>
            <select value={form.adminId} onChange={(e) => {
              const admin = admins.find(a => a.id === e.target.value);
              setForm(p => ({ ...p, adminId: e.target.value, adminName: admin?.name || "" }));
            }} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900">
              <option value="">Seçiniz</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">Bayi</label>
            <select value={form.dealerId} onChange={(e) => setForm(p => ({ ...p, dealerId: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900">
              <option value="">Seçiniz</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.company})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200 text-gray-500">İptal</Button>
            <Button onClick={handleSave} disabled={saving}>Ata</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
