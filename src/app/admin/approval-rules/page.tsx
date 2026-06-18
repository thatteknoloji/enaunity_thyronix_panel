"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, CheckCircle, XCircle, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface ApprovalRule {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  categories: string;
  dealerGroups: string;
  minItemCount: number;
  active: boolean;
}

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", minAmount: 0, maxAmount: 0, categories: "", dealerGroups: "", minItemCount: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/approval-rules").then(r => r.json()).then(d => {
      if (d.success) setRules(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error("Kural adı gerekli"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/approval-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categories: form.categories ? form.categories.split(",").map(s => s.trim()).filter(Boolean) : [],
        dealerGroups: form.dealerGroups ? form.dealerGroups.split(",").map(s => s.trim()).filter(Boolean) : [],
      }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Kural eklendi");
      setRules(prev => [d.data, ...prev]);
      setShowModal(false);
      setForm({ name: "", minAmount: 0, maxAmount: 0, categories: "", dealerGroups: "", minItemCount: 0 });
    } else toast.error(d.error);
    setSaving(false);
  };

  const toggleActive = async (rule: ApprovalRule) => {
    const res = await fetch(`/api/admin/approval-rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (res.ok) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kural silinsin mi?")) return;
    await fetch(`/api/admin/approval-rules/${id}`, { method: "DELETE" });
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Silindi");
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-100"/><div className="h-64 rounded bg-gray-100"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onay Kuralları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tutar, kategori veya bayi grubuna göre ek onay kuralları</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus size={16} /> Yeni Kural</Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <AlertTriangle size={48} className="mx-auto text-gray-200" />
          <p className="mt-3 text-gray-500">Henüz onay kuralı tanımlanmamış</p>
          <p className="text-xs text-gray-400 mt-1">Tüm bayiler tek aşamalı onay ile çalışıyor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const cats = JSON.parse(rule.categories || "[]");
            const groups = JSON.parse(rule.dealerGroups || "[]");
            return (
              <div key={rule.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${rule.active ? "bg-emerald-100 text-emerald-700" : "bg-ena-primary/10 text-ena-primary"}`}>
                        {rule.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {rule.active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {rule.minAmount > 0 && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Min: {rule.minAmount.toLocaleString("tr-TR")} TL</span>}
                      {rule.maxAmount > 0 && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Max: {rule.maxAmount.toLocaleString("tr-TR")} TL</span>}
                      {rule.minItemCount > 0 && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Min {rule.minItemCount} kalem</span>}
                      {cats.map((c: string) => <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{c}</span>)}
                      {groups.map((g: string) => <span key={g} className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{g}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button variant="outline" size="sm" onClick={() => toggleActive(rule)} className="border-gray-200 text-gray-500">
                      {rule.active ? "Pasif" : "Aktif"}
                    </Button>
                    <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg text-gray-400 hover:text-ena-primary transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yeni Onay Kuralı" size="md">
        <div className="space-y-4">
          <Input label="Kural Adı" placeholder="Örn: 10.000 TL Üzeri Onay" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min. Tutar (TL)" type="number" value={form.minAmount} onChange={(e) => setForm(p => ({ ...p, minAmount: Number(e.target.value) }))} />
            <Input label="Max. Tutar (TL)" type="number" value={form.maxAmount} onChange={(e) => setForm(p => ({ ...p, maxAmount: Number(e.target.value) }))} />
          </div>
          <Input label="Min. Kalem Sayısı" type="number" value={form.minItemCount} onChange={(e) => setForm(p => ({ ...p, minItemCount: Number(e.target.value) }))} />
          <Input label="Kategoriler (virgülle ayırın, boş = tümü)" placeholder="Tablo, Halı, Perde" value={form.categories} onChange={(e) => setForm(p => ({ ...p, categories: e.target.value }))} />
          <Input label="Bayi Grupları (virgülle ayırın, boş = tümü)" placeholder="gold, silver, bronze" value={form.dealerGroups} onChange={(e) => setForm(p => ({ ...p, dealerGroups: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200 text-gray-500">İptal</Button>
            <Button onClick={handleSave} disabled={saving}>Kaydet</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
