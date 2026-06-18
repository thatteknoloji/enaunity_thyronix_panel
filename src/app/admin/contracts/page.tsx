"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, ArrowLeft, FileText, Eye, Users, X } from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
import toast from "react-hot-toast";

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [dealers, setDealers] = useState<any[]>([]);
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = () => {
    fetch("/api/admin/contracts").then(r => r.json()).then(d => setContracts(d.data || [])).finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Başlık gerekli");
    setSaving(true);
    const body = { title, slug: slug || title.toLowerCase().replace(/\s+/g, "-"), content };
    const url = editing ? `/api/admin/contracts/${editing.id}` : "/api/admin/contracts";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success(editing ? "Güncellendi" : "Oluşturuldu");
      fetchContracts();
      setEditing(null); setTitle(""); setSlug(""); setContent("");
    } else toast.error("Hata");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    fetchContracts(); toast.success("Silindi");
  };

  const startEdit = (c: any) => {
    setEditing(c); setTitle(c.title); setSlug(c.slug); setContent(c.content || "");
  };

  const openAssign = async (contract: any) => {
    setAssignModal(contract);
    setSelectedDealers([]);
    setAssignments([]);
    const [dRes, aRes] = await Promise.all([
      fetch("/api/admin/dealers"),
      fetch(`/api/admin/contracts/${contract.id}/assign`),
    ]);
    const dData = await dRes.json();
    const aData = await aRes.json();
    if (dData.success) setDealers(dData.data);
    if (aData.success) setAssignments(aData.data);
  };

  const toggleDealer = (id: string) => {
    setSelectedDealers((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedDealers.length === 0) return toast.error("En az bir bayi seçin");
    setAssigning(true);
    const res = await fetch(`/api/admin/contracts/${assignModal.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerIds: selectedDealers }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`${data.assigned} bayiye atandı`);
      openAssign(assignModal);
    } else {
      toast.error(data.error || "Hata");
    }
    setAssigning(false);
  };

  const removeAssignment = async (dealerId: string) => {
    if (!confirm("Bu bayi için atamayı kaldırsın mı?")) return;
    const res = await fetch(`/api/admin/contracts/${assignModal.id}/assign`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealerId }),
    });
    if (res.ok) {
      toast.success("Atama kaldırıldı");
      openAssign(assignModal);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sözleşmeler</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">KVKK, gizlilik, kullanım koşulları gibi sayfaları yönet</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditing(null); setTitle(""); setSlug(""); setContent(""); }}>
            <Plus size={16} className="mr-1" /> Yeni Sözleşme
          </Button>
        </div>
      </div>

      {(editing !== undefined && (editing || !editing)) && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{editing ? "Düzenle" : "Yeni Sözleşme"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Başlık</label>
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={title} onChange={e => setTitle(e.target.value)} placeholder="Sözleşme başlığı"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Slug (URL)</label>
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={slug} onChange={e => setSlug(e.target.value)} placeholder="sayfa-linki"
              />
            </div>
          </div>

          <RichTextEditor content={content} onChange={setContent} minHeight={300} />

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(undefined); setTitle(""); setSlug(""); setContent(""); }}>
              İptal
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-12">Yükleniyor...</p>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">Henüz sözleşme eklenmedi</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Başlık</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Tür</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Tür</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Atama</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">/{c.slug}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{c.type}</td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="ghost" onClick={() => openAssign(c)} className="text-xs">
                      <Users size={14} className="mr-1" /> Atama Yap
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <a href={`/contracts/${c.slug}`} target="_blank" rel="noopener" className="text-gray-400 hover:text-blue-500 p-1"><Eye size={14} /></a>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Düzenle</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-ena-primary"><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {assignModal.title} - Atama
              </h2>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {assignments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Atanmış Bayiler</h3>
                <div className="space-y-1">
                  {assignments.map((a: any) => (
                    <div key={a.dealerId} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 text-sm">
                      <div>
                        <span className="text-gray-900 dark:text-gray-100">{a.dealer.name || a.dealer.company}</span>
                        <span className="text-xs text-gray-400 ml-2">{a.dealer.email}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          a.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          a.status === "rejected" ? "bg-ena-primary/10 text-ena-primary dark:bg-red-900/30 dark:text-ena-primary" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {a.status === "approved" ? "Onaylı" : a.status === "rejected" ? "Red" : "Bekliyor"}
                        </span>
                      </div>
                      <button onClick={() => removeAssignment(a.dealerId)} className="text-ena-primary hover:text-ena-primary"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Bayi Ekle</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
                {dealers.map((d: any) => (
                  <label
                    key={d.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedDealers.includes(d.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                        : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDealers.includes(d.id)}
                      onChange={() => toggleDealer(d.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-gray-100">{d.name || d.company}</span>
                      <span className="text-xs text-gray-400 ml-2">{d.email}</span>
                    </div>
                  </label>
                ))}
              </div>
              <Button size="sm" onClick={handleAssign} disabled={assigning || selectedDealers.length === 0}>
                {assigning ? "Atanıyor..." : `${selectedDealers.length} Bayiye Ata`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
