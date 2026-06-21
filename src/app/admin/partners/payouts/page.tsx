"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Row = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerTypeLabel: string;
  referralCode: string;
  amount: number;
  status: string;
  statusLabel: string;
  iban: string;
  accountHolder: string;
  adminNote: string | null;
  requestedAt: string;
  paidAt: string | null;
};

const STATUSES = ["", "REQUESTED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"];
const TYPES = ["", "PROFESSIONAL_DEALER", "SOCIAL_DEALER", "POD_CREATOR", "AI_PARTNER"];

export default function AdminPartnersPayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    partnerType: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [noteEdit, setNoteEdit] = useState<{ id: string; note: string } | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (filters.status) q.set("status", filters.status);
    if (filters.partnerType) q.set("partnerType", filters.partnerType);
    if (filters.dateFrom) q.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) q.set("dateTo", filters.dateTo);
    if (filters.search) q.set("search", filters.search);
    fetch(`/api/admin/partners/payouts?${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRows(d.data); });
  }, [filters]);

  useEffect(load, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/partners/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.success) {
      toast.error(d.error || "İşlem başarısız");
      return;
    }
    toast.success("Güncellendi");
    setNoteEdit(null);
    load();
  }

  return (
    <PartnerAdminShell title="Partner Ödemeleri" description="Ödeme talepleri yönetimi">
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="text-xs border rounded-lg px-2 py-1.5"
        >
          <option value="">Tüm durumlar</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.partnerType}
          onChange={(e) => setFilters({ ...filters, partnerType: e.target.value })}
          className="text-xs border rounded-lg px-2 py-1.5"
        >
          <option value="">Tüm tipler</option>
          {TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="text-xs border rounded-lg px-2 py-1.5" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="text-xs border rounded-lg px-2 py-1.5" />
        <input
          placeholder="Ara: ad, e-posta, IBAN, kod"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="text-xs border rounded-lg px-2 py-1.5 min-w-[200px]"
        />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Partner</th>
              <th className="px-3 py-2 text-left">Tip</th>
              <th className="px-3 py-2 text-left">Tutar</th>
              <th className="px-3 py-2 text-left">IBAN</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <Link href={toAdminUrl(`/admin/partners/${r.partnerId}`)} className="text-blue-600 hover:underline text-xs">
                    {r.partnerName || r.referralCode}
                  </Link>
                  <p className="text-[10px] text-gray-400">{r.partnerEmail}</p>
                </td>
                <td className="px-3 py-2 text-xs">{r.partnerTypeLabel}</td>
                <td className="px-3 py-2 font-semibold">{r.amount.toFixed(2)} ₺</td>
                <td className="px-3 py-2 font-mono text-[10px]">{r.iban}</td>
                <td className="px-3 py-2 text-xs">{r.statusLabel}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(r.requestedAt).toLocaleDateString("tr-TR")}
                  {r.paidAt && <span className="block text-green-600">Ödendi: {new Date(r.paidAt).toLocaleDateString("tr-TR")}</span>}
                </td>
                <td className="px-3 py-2 text-[10px] space-x-1 whitespace-nowrap">
                  {r.status === "REQUESTED" && (
                    <>
                      <button type="button" onClick={() => patch(r.id, { status: "PROCESSING" })} className="text-blue-600 hover:underline">İşleme Al</button>
                      <button type="button" onClick={() => patch(r.id, { status: "REJECTED", adminNote: "Reddedildi" })} className="text-red-600 hover:underline">Reddet</button>
                    </>
                  )}
                  {r.status === "PROCESSING" && (
                    <>
                      <button type="button" onClick={() => patch(r.id, { status: "PAID" })} className="text-green-600 hover:underline">Ödendi</button>
                      <button type="button" onClick={() => patch(r.id, { status: "CANCELLED" })} className="text-gray-600 hover:underline">İptal</button>
                    </>
                  )}
                  <button type="button" onClick={() => setNoteEdit({ id: r.id, note: r.adminNote || "" })} className="text-violet-600 hover:underline">Not</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {noteEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full space-y-3">
            <h3 className="font-semibold">Admin Notu</h3>
            <textarea
              value={noteEdit.note}
              onChange={(e) => setNoteEdit({ ...noteEdit, note: e.target.value })}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => patch(noteEdit.id, { adminNote: noteEdit.note })} className="text-sm text-blue-600">Kaydet</button>
              <button type="button" onClick={() => setNoteEdit(null)} className="text-sm text-gray-500">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </PartnerAdminShell>
  );
}
