"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  MEMBER_DOCUMENT_LABELS,
  MEMBER_REQUIRED_DOCUMENTS,
  MEMBER_STATUS_LABELS,
  checklistItemsProgress,
  type MemberChecklistItem,
  type MemberStatus,
} from "@/lib/members/checklist";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Store,
  UserCheck,
  Users,
  X,
  XCircle,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

type MemberDoc = {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  fileName: string;
  status: string;
  adminNote: string;
};

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
  adminNote?: string;
  rejectionReason: string;
  approvedAt: string | null;
  reviewedBy: string;
  createdAt: string;
  dealerId: string | null;
  checklist: MemberChecklistItem[];
  checklistComplete: boolean;
  memberDocuments?: MemberDoc[];
  _count: { orders: number };
};

const statusColors: Record<MemberStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
};

const docStatusColors: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-emerald-700 bg-emerald-50",
  rejected: "text-red-700 bg-red-50",
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberRow | null>(null);
  const [profile, setProfile] = useState({ name: "", phone: "", company: "", taxNumber: "", taxOffice: "", adminNote: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all" && !search.trim()) params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/admin/members?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setMembers(d.data || []); })
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/members/${id}`);
    const d = await res.json();
    if (d.success) {
      setDetail(d.data);
      setProfile({
        name: d.data.name || "",
        phone: d.data.phone || "",
        company: d.data.company || "",
        taxNumber: d.data.taxNumber || "",
        taxOffice: d.data.taxOffice || "",
        adminNote: d.data.adminNote || "",
      });
      setRejectReason("");
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const patch = async (body: Record<string, unknown>) => {
    if (!selectedId) return null;
    setSaving(true);
    const res = await fetch(`/api/admin/members/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      setDetail(d.data);
      loadMembers();
      return d;
    }
    toast.error(d.error || "İşlem başarısız");
    return null;
  };

  const saveProfile = async () => {
    const d = await patch({ action: "update_profile", profile });
    if (d) toast.success("Bilgiler kaydedildi");
  };

  const reviewDoc = async (documentId: string, status: string) => {
    const d = await patch({ action: "review_document", documentId, status });
    if (d) toast.success(status === "approved" ? "Evrak onaylandı" : "Evrak reddedildi");
  };

  const approveMember = async () => {
    const d = await patch({ action: "approve" });
    if (d) { toast.success("Üye onaylandı"); setSelectedId(null); }
  };

  const rejectMember = async () => {
    const d = await patch({ action: "reject", reason: rejectReason });
    if (d) { toast.success("Başvuru reddedildi"); setSelectedId(null); }
  };

  const promoteDealer = async () => {
    if (!confirm("Bu üyeyi bayiye çevirmek istediğinize emin misiniz? Bayi onay sürecine aktarılacak.")) return;
    const d = await patch({ action: "promote_dealer" });
    if (d) {
      toast.success("Bayiye çevrildi — Bayi Onaylarından devam edin");
      setSelectedId(null);
    }
  };

  const progress = detail ? checklistItemsProgress(detail.checklist) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} /> Üyeler
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Koşullar sistemden otomatik hesaplanır · Evrakları görüntüleyip onaylayın · Sonra bayiye çevirin
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
          { key: "all", label: "Tümü" },
          { key: "pending", label: "Onay Bekleyen" },
          { key: "active", label: "Aktif" },
          { key: "rejected", label: "Reddedilen" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
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
            <tr className="border-b bg-gray-50/80">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Üye</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Firma</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">Koşullar</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Üye bulunamadı</td></tr>
            ) : (
              members.map((m) => {
                const p = checklistItemsProgress(m.checklist);
                return (
                  <tr key={m.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                      {m.role === "dealer" && <span className="text-[10px] text-purple-600">Bayi</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{m.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[m.status]}`}>
                        {MEMBER_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={p.done === p.total ? "text-emerald-600" : "text-amber-600"}>{p.done}/{p.total}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedId(m.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white">
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

      {detail && selectedId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">{detail.name}</h2>
                <p className="text-xs text-gray-500">{detail.email} · {MEMBER_STATUS_LABELS[detail.status]}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Profil düzenleme */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Başvuru Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["name", "Ad Soyad"],
                    ["phone", "Telefon"],
                    ["company", "Firma / Ünvan"],
                    ["taxNumber", "Vergi No"],
                    ["taxOffice", "Vergi Dairesi"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-xs">
                      <span className="text-gray-500">{label}</span>
                      <input
                        value={profile[key as keyof typeof profile]}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
                <label className="block text-xs mt-3">
                  <span className="text-gray-500">Admin notu</span>
                  <textarea
                    value={profile.adminNote}
                    onChange={(e) => setProfile({ ...profile, adminNote: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  disabled={saving}
                  onClick={saveProfile}
                  className="mt-3 inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save size={14} /> Bilgileri Kaydet
                </button>
              </section>

              {/* Evraklar */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Yüklenen Evraklar</h3>
                <div className="space-y-2">
                  {MEMBER_REQUIRED_DOCUMENTS.map((type) => {
                    const doc = detail.memberDocuments?.find((d) => d.type === type);
                    return (
                      <div key={type} className="rounded-lg border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{MEMBER_DOCUMENT_LABELS[type]}</p>
                          {doc ? (
                            <>
                              <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                                <ExternalLink size={12} /> Görüntüle / İndir
                              </a>
                            </>
                          ) : (
                            <p className="text-xs text-red-600">Henüz yüklenmedi</p>
                          )}
                        </div>
                        {doc && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${docStatusColors[doc.status] || ""}`}>
                              {doc.status === "approved" ? "Onaylı" : doc.status === "rejected" ? "Reddedildi" : "Bekliyor"}
                            </span>
                            {doc.status !== "approved" && (
                              <button disabled={saving} onClick={() => reviewDoc(doc.id, "approved")} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">
                                Onayla
                              </button>
                            )}
                            {doc.status !== "rejected" && (
                              <button disabled={saving} onClick={() => reviewDoc(doc.id, "rejected")} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600">
                                Reddet
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Otomatik koşullar */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Onay Koşulları (otomatik)</h3>
                  <span className={`text-xs font-medium ${progress?.done === progress?.total ? "text-emerald-600" : "text-amber-600"}`}>
                    {progress?.done}/{progress?.total}
                  </span>
                </div>
                <div className="space-y-2">
                  {detail.checklist.map((item) => (
                    <div key={item.key} className={`flex gap-3 rounded-lg border px-3 py-2 ${item.ok ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"}`}>
                      {item.ok ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-600">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Aksiyonlar */}
              <section className="border-t border-gray-100 pt-4 space-y-3">
                {detail.status === "pending" && (
                  <>
                    <button
                      disabled={saving || !detail.checklistComplete}
                      onClick={approveMember}
                      className="w-full sm:w-auto px-5 py-2.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} /> Üyeliği Onayla
                    </button>
                    {!detail.checklistComplete && (
                      <p className="text-xs text-amber-700">Tüm koşullar ve evrak onayları tamamlanmadan üye onaylanamaz.</p>
                    )}
                    <div className="space-y-2 pt-2">
                      <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Red sebebi…" rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      <button disabled={saving || !rejectReason.trim()} onClick={rejectMember} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50">
                        Başvuruyu Reddet
                      </button>
                    </div>
                  </>
                )}

                {detail.status === "active" && detail.role === "user" && (
                  <button
                    disabled={saving || !detail.checklistComplete}
                    onClick={promoteDealer}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Store size={16} /> Bayiye Çevir
                  </button>
                )}

                {detail.role === "dealer" && detail.dealerId && (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/dealers`} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Bayi Kaydına Git</Link>
                    <Link href="/admin/dealer-approvals" className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Bayi Onayları</Link>
                  </div>
                )}

                {detail.status === "active" && detail.approvedAt && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1">
                    <Check size={12} /> Üye onayı · {formatDate(detail.approvedAt)}
                    {detail.reviewedBy ? ` · ${detail.reviewedBy}` : ""}
                  </p>
                )}

                {detail.status === "rejected" && (
                  <p className="text-xs text-red-600">{detail.rejectionReason}</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
