"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, ArrowLeft, Users } from "lucide-react";
import toast from "react-hot-toast";

interface DealerGroup {
  id: string;
  name: string;
  discountRate: number;
  creditLimit: number;
  allowNegativeBalance: boolean;
  minOrderAmount: number;
  paymentDays: number;
  rules: string;
  _count?: { dealers: number };
}

export default function DealerGroupsPage() {
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", discountRate: 0, creditLimit: 0, allowNegativeBalance: false,
    minOrderAmount: 0, paymentDays: 0, rules: "",
  });

  const fetchGroups = () => {
    fetch("/api/admin/dealer-groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGroups(); }, []);

  const resetForm = () => {
    setForm({ name: "", discountRate: 0, creditLimit: 0, allowNegativeBalance: false, minOrderAmount: 0, paymentDays: 0, rules: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Grup adı gerekli");
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/admin/dealer-groups", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingId ? "Grup güncellendi" : "Grup oluşturuldu");
        fetchGroups();
        resetForm();
      } else {
        toast.error("Kaydedilemedi");
      }
    } catch { toast.error("Hata oluştu"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} grubunu silmek istediğine emin misin?`)) return;
    await fetch("/api/admin/dealer-groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchGroups();
    toast.success("Grup silindi");
  };

  const startEdit = (g: DealerGroup) => {
    setForm({
      name: g.name, discountRate: g.discountRate, creditLimit: g.creditLimit,
      allowNegativeBalance: g.allowNegativeBalance, minOrderAmount: g.minOrderAmount,
      paymentDays: g.paymentDays, rules: g.rules,
    });
    setEditingId(g.id);
    setShowForm(true);
  };

  const seedDefaults = async () => {
    const defaults = [
      { name: "bronze", discountRate: 0, creditLimit: 0, allowNegativeBalance: false, minOrderAmount: 0, paymentDays: 0, rules: '{"label":"Bronz"}' },
      { name: "silver", discountRate: 5, creditLimit: 5000, allowNegativeBalance: true, minOrderAmount: 1000, paymentDays: 30, rules: '{"label":"Gümüş"}' },
      { name: "gold", discountRate: 10, creditLimit: 20000, allowNegativeBalance: true, minOrderAmount: 5000, paymentDays: 60, rules: '{"label":"Altın"}' },
    ];
    for (const d of defaults) {
      await fetch("/api/admin/dealer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
    }
    fetchGroups();
    toast.success("Varsayılan gruplar oluşturuldu");
  };

  const renderField = (label: string, children: React.ReactNode) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase">{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bayi Grupları</h1>
          <p className="mt-1 text-sm text-gray-500">Bayi gruplarını yönet, indirim ve limit tanımla</p>
        </div>
        <div className="ml-auto flex gap-2">
          {groups.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedDefaults}>Varsayılanları Oluştur</Button>
          )}
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} className="mr-1" /> Yeni Grup
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? "Grubu Düzenle" : "Yeni Grup"}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {renderField("Grup Adı", <Input id="gn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn: platinum" />)}
            {renderField("İndirim (%)", <Input id="dr" type="number" value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: parseFloat(e.target.value) || 0 })} />)}
            {renderField("Kredi Limiti (₺)", <Input id="cl" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />)}
            {renderField("Vade (Gün)", <Input id="pd" type="number" value={form.paymentDays} onChange={(e) => setForm({ ...form, paymentDays: parseInt(e.target.value) || 0 })} />)}
            {renderField("Min Sipariş (₺)", <Input id="mo" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })} />)}
            {renderField("Eksi Bakiye", (
              <button onClick={() => setForm({ ...form, allowNegativeBalance: !form.allowNegativeBalance })}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${form.allowNegativeBalance ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                {form.allowNegativeBalance ? "İzin Verildi" : "İzin Verilmedi"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-12">Yükleniyor...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Users size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz grup tanımlanmadı</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Grup</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">İndirim</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Kredi Limiti</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Vade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Eksi Bakiye</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Bayi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 capitalize">{g.name}</p>
                    <p className="text-[10px] text-gray-400">{g.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-emerald-700 font-medium">%{g.discountRate}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {g.creditLimit > 0 ? `₺${g.creditLimit.toLocaleString("tr-TR")}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {g.paymentDays > 0 ? `${g.paymentDays} gün` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${g.allowNegativeBalance ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {g.allowNegativeBalance ? "Açık" : "Kapalı"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{g._count?.dealers || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(g)}>Düzenle</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(g.id, g.name)} className="text-ena-primary hover:text-ena-primary">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
