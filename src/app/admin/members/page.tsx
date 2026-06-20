"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  MEMBER_CHECKLIST_LABELS,
  MEMBER_STATUS_LABELS,
  checklistProgress,
  type MemberChecklist,
  type MemberStatus,
} from "@/lib/members/checklist";
import { Check, Clock, Search, UserCheck, Users, X } from "lucide-react";
import toast from "react-hot-toast";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  phone: string;
  company: string;
  taxNumber: string;
  taxOffice: string;
  rejectionReason: string;
  approvedAt: string | null;
  reviewedBy: string;
  createdAt: string;
  checklist: MemberChecklist;
  _count: { orders: number };
};

const statusColors: Record<MemberStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [checklist, setChecklist] = useState<MemberChecklist | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/admin/members?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMembers(d.data || []);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const openMember = (m: MemberRow) => {
    setSelected(m);
    setChecklist({ ...m.checklist });
    setRejectReason("");
  };

  const saveChecklist = async () => {
    if (!selected || !checklist) return;
    setSaving(true);
    const res = await fetch(`/api/admin/members/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      toast.success("Kontrol listesi kaydedildi");
      loadMembers();
    } else toast.error(d.error || "Kaydedilemedi");
  };

  const approve = async () => {
    if (!selected || !checklist) return;
    setSaving(true);
    const res = await fetch(`/api/admin/members/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", checklist }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      toast.success("Üye onaylandı");
      setSelected(null);
      loadMembers();
    } else toast.error(d.error || "Onaylanamadı");
  };

  const reject = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/admin/members/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason: rejectReason }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      toast.success("Başvuru reddedildi");
      setSelected(null);
      loadMembers();
    } else toast.error(d.error || "Reddedilemedi");
  };

  const progress = checklist ? checklistProgress(checklist) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} /> Üyeler
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Site kayıtları · 8 koşul tamamlanınca onaylanır
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, e-posta, firma ara…"
            className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending", label: "Onay Bekleyen" },
          { key: "active", label: "Aktif" },
          { key: "rejected", label: "Reddedilen" },
          { key: "suspended", label: "Askıda" },
          { key: "all", label: "Tümü" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Üye</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Firma</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">Koşullar</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Kayıt</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Users size={28} className="mx-auto mb-2 text-gray-300" />
                  Bu filtrede üye bulunamadı
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const p = checklistProgress(m.checklist);
                return (
                  <tr key={m.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{m.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[m.status]}`}>
                        {MEMBER_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {p.done}/{p.total}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openMember(m)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && checklist && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.name}</h2>
                <p className="text-xs text-gray-500">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Telefon</span><p>{selected.phone || "—"}</p></div>
                <div><span className="text-gray-500">Firma</span><p>{selected.company || "—"}</p></div>
                <div><span className="text-gray-500">Vergi No</span><p>{selected.taxNumber || "—"}</p></div>
                <div><span className="text-gray-500">Vergi Dairesi</span><p>{selected.taxOffice || "—"}</p></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">8 Onay Koşulu</h3>
                  <span className="text-xs text-gray-500">{progress?.done}/{progress?.total}</span>
                </div>
                <div className="space-y-2">
                  {(Object.keys(MEMBER_CHECKLIST_LABELS) as (keyof MemberChecklist)[]).map((key) => (
                    <label key={key} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checklist[key]}
                        onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{MEMBER_CHECKLIST_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selected.status === "pending" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    disabled={saving}
                    onClick={saveChecklist}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Listeyi Kaydet
                  </button>
                  <button
                    disabled={saving || progress?.done !== progress?.total}
                    onClick={approve}
                    className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserCheck size={14} /> Onayla
                  </button>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Reddet</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Red sebebi…"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    disabled={saving || !rejectReason.trim()}
                    onClick={reject}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <X size={14} /> Reddet
                  </button>
                </div>
              )}

              {selected.status === "active" && selected.approvedAt && (
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <Check size={12} /> Onaylandı · {formatDate(selected.approvedAt)}
                  {selected.reviewedBy ? ` · ${selected.reviewedBy}` : ""}
                </p>
              )}

              {selected.status === "rejected" && selected.rejectionReason && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <Clock size={12} /> {selected.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
