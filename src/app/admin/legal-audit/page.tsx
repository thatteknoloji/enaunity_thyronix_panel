"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Shield, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Acceptance = {
  id: string;
  email: string;
  contractSlug: string;
  contractTitle: string;
  contractVersionNum: number;
  contentHash: string;
  context: string;
  optional: boolean;
  acceptedAt: string;
  ipAddress: string;
  browser: string;
  os: string;
};

type ContractRow = {
  id: string;
  title: string;
  slug: string;
  version: number;
  contentHash: string;
  category: string;
  versions: { version: number; contentHash: string; publishedAt: string; isActive: boolean }[];
};

export default function AdminLegalAuditPage() {
  const [tab, setTab] = useState<"acceptances" | "audit" | "emails" | "reacceptance">("acceptances");
  const [search, setSearch] = useState("");
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: string; eventType: string; email: string; ipAddress: string; payload: string; createdAt: string }[]>([]);
  const [reacceptReport, setReacceptReport] = useState<{
    pendingCount: number;
    pendingByContract: Record<string, number>;
    pendingTasks: { id: string; email: string; contractSlug: string; contractTitle: string; fromVersionNum: number; toVersionNum: number; emailStatus: string; user: { name: string; email: string } }[];
    recentEmails: { email: string; subject: string; status: string; createdAt: string }[];
    completedRecent: { email: string; contractTitle: string; completedAt: string | null; user: { name: string } }[];
  } | null>(null);
  const [emailLogs, setEmailLogs] = useState<{ id: string; email: string; subject: string; status: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (search && tab === "acceptances") params.set("q", search);
    fetch(`/api/admin/legal-audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        if (tab === "acceptances") {
          setAcceptances(d.data.acceptances || []);
          setContracts(d.data.contracts || []);
        } else if (tab === "audit") setAuditLogs(d.data || []);
        else if (tab === "reacceptance") setReacceptReport(d.data);
        else setEmailLogs(d.data || []);
      })
      .finally(() => setLoading(false));
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield size={24} /> Hukuki Onay & Denetim</h1>
        <p className="text-sm text-gray-500 mt-1">Sözleşme versiyonları, onay kayıtları, hash kanıtları ve e-posta logları</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "acceptances", label: "Onay Kayıtları", icon: FileText },
          { key: "audit", label: "Audit Log", icon: Shield },
          { key: "reacceptance", label: "Yeniden Onay", icon: Shield },
          { key: "emails", label: "E-posta Log", icon: Mail },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${tab === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "acceptances" && (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="E-posta veya sözleşme ara…" className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" />
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-sm">Sözleşme Versiyonları</div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {contracts.map((c) => (
                <div key={c.id} className="px-4 py-2 text-xs flex flex-wrap items-center gap-2">
                  <Link href={toAdminUrl(`/admin/contracts/${c.id}`)} className="font-medium text-blue-600 hover:underline">{c.title}</Link>
                  <span className="text-gray-500">v{c.version}</span>
                  <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]">{c.contentHash.slice(0, 16)}…</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2 text-left">E-posta</th>
                  <th className="px-3 py-2 text-left">Sözleşme</th>
                  <th className="px-3 py-2 text-left">v / Hash</th>
                  <th className="px-3 py-2 text-left">Bağlam</th>
                  <th className="px-3 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Yükleniyor…</td></tr>
                ) : acceptances.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Kayıt yok</td></tr>
                ) : (
                  acceptances.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(a.acceptedAt)}</td>
                      <td className="px-3 py-2">{a.email}</td>
                      <td className="px-3 py-2">
                        <a href={`/contracts/${a.contractSlug}`} target="_blank" className="text-blue-600 hover:underline">{a.contractTitle}</a>
                        {a.optional && <span className="ml-1 text-[10px] text-gray-400">(opsiyonel)</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">v{a.contractVersionNum}<br />{a.contentHash.slice(0, 12)}…</td>
                      <td className="px-3 py-2">{a.context}</td>
                      <td className="px-3 py-2 text-xs">{a.ipAddress}<br />{a.browser}/{a.os}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "audit" && (
        <div className="rounded-xl border bg-white divide-y max-h-[70vh] overflow-y-auto text-sm">
          {auditLogs.map((l) => (
            <div key={l.id} className="px-4 py-3">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{l.eventType}</span>
                <span className="text-xs text-gray-500">{formatDate(l.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{l.email} · {l.ipAddress}</p>
              <pre className="text-[10px] text-gray-400 mt-1 overflow-x-auto">{l.payload}</pre>
            </div>
          ))}
        </div>
      )}

      {tab === "emails" && (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left">Tarih</th><th className="px-3 py-2 text-left">E-posta</th><th className="px-3 py-2 text-left">Konu</th><th className="px-3 py-2 text-left">Durum</th></tr></thead>
            <tbody className="divide-y">
              {emailLogs.map((e) => (
                <tr key={e.id}><td className="px-3 py-2">{formatDate(e.createdAt)}</td><td className="px-3 py-2">{e.email}</td><td className="px-3 py-2">{e.subject}</td><td className="px-3 py-2">{e.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reacceptance" && reacceptReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-500">Bekleyen kullanıcı</p>
              <p className="text-2xl font-bold text-amber-700">{reacceptReport.pendingCount}</p>
            </div>
            {Object.entries(reacceptReport.pendingByContract).map(([slug, count]) => (
              <div key={slug} className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500 truncate">{slug}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left">Kullanıcı</th>
                  <th className="px-3 py-2 text-left">Sözleşme</th>
                  <th className="px-3 py-2 text-left">Versiyon</th>
                  <th className="px-3 py-2 text-left">Mail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reacceptReport.pendingTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">{t.user?.name || t.email}<br /><span className="text-xs text-gray-500">{t.email}</span></td>
                    <td className="px-3 py-2">{t.contractTitle}</td>
                    <td className="px-3 py-2">v{t.fromVersionNum}.0 → v{t.toVersionNum}.0</td>
                    <td className="px-3 py-2">{t.emailStatus || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
