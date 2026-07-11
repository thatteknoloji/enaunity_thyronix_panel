"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Trash2, FileText, Eye, EyeOff, Edit, Users, X, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { contractTypeLabel, isPublicContractListing } from "@/lib/contracts/types";

type ContractItem = {
  id: string;
  title: string;
  slug: string;
  type: string;
  active: boolean;
  createdAt: string;
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [assignModal, setAssignModal] = useState<ContractItem | null>(null);
  const [dealers, setDealers] = useState<{ id: string; name?: string; company?: string; email: string }[]>([]);
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<{ dealerId: string; status: string; dealer: { name?: string; company?: string; email: string } }[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/contracts")
      .then((r) => r.json())
      .then((d) => setContracts(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-site-content", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${data.data.contracts} sözleşme yüklendi`);
        fetchContracts();
      } else {
        toast.error(data.error || "Yüklenemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (c: ContractItem) => {
    const res = await fetch(`/api/admin/contracts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (res.ok) {
      toast.success(c.active ? "Yayından kaldırıldı" : "Yayınlandı");
      fetchContracts();
    } else toast.error("Hata");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Silindi"); fetchContracts(); }
    else toast.error("Hata");
  };

  const openAssign = async (contract: ContractItem) => {
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
    if (!assignModal || selectedDealers.length === 0) return toast.error("En az bir bayi seçin");
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
    if (!assignModal || !confirm("Bu bayi için atamayı kaldırsın mı?")) return;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sözleşmeler</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            KVKK, gizlilik, mesafeli satış gibi yasal metinler. Herkese açık olanlar{" "}
            <a href="/contracts" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">/contracts</a>
            {" "}sayfasında listelenir. SSS / İletişim gibi sayfalar{" "}
            <Link href={toAdminUrl("/admin/pages")} className="text-blue-600 hover:underline">Sayfalar</Link>
            {" "}bölümündedir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {contracts.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={15} /> {seeding ? "Yükleniyor..." : "Varsayılanları Yükle"}
            </button>
          )}
          <Link
            href={toAdminUrl("/admin/contracts/new")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} /> Yeni Sözleşme
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <FileText size={40} className="mx-auto text-gray-300 animate-pulse" />
          <p className="mt-3 text-gray-500">Yükleniyor...</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <FileText size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz sözleşme eklenmedi</p>
          <p className="mt-1 text-xs text-gray-400 mb-4">KVKK, Gizlilik, Mesafeli Satış ve Bayi sözleşmesini tek tıkla yükleyebilirsiniz.</p>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            <Download size={15} /> {seeding ? "Yükleniyor..." : "Varsayılanları Yükle"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm table-scroll">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">URL</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tür</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Bayi</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    {isPublicContractListing(c.type) ? (
                      <p className="text-[10px] text-gray-400 mt-0.5">/contracts listesinde</p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5">Bayi ataması ile</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a
                      href={`/contracts/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-mono"
                    >
                      /contracts/{c.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {contractTypeLabel(c.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        c.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}
                    >
                      {c.active ? <Eye size={11} /> : <EyeOff size={11} />}
                      {c.active ? "Yayında" : "Taslak"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.type === "dealer" ? (
                      <button
                        type="button"
                        onClick={() => openAssign(c)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                      >
                        <Users size={13} /> Atama
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`/contracts/${c.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Canlıda gör"
                      >
                        <Eye size={14} />
                      </a>
                      <Link
                        href={toAdminUrl(`/admin/contracts/${c.id}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-ena-primary hover:bg-ena-primary/5 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{assignModal.title} — Bayi Ataması</h2>
              <button type="button" onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {assignments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Atanmış Bayiler</h3>
                <div className="space-y-1">
                  {assignments.map((a) => (
                    <div key={a.dealerId} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                      <div>
                        <span className="text-gray-900">{a.dealer.name || a.dealer.company}</span>
                        <span className="text-xs text-gray-400 ml-2">{a.dealer.email}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          a.status === "approved" ? "bg-green-100 text-green-700" :
                          a.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {a.status === "approved" ? "Onaylı" : a.status === "rejected" ? "Red" : "Bekliyor"}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeAssignment(a.dealerId)} className="text-gray-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bayi Ekle</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
                {dealers.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedDealers.includes(d.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDealers.includes(d.id)}
                      onChange={() => toggleDealer(d.id)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="text-gray-900">{d.name || d.company}</span>
                      <span className="text-xs text-gray-400 ml-2">{d.email}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedDealers.length === 0}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {assigning ? "Atanıyor..." : `${selectedDealers.length} Bayiye Ata`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
