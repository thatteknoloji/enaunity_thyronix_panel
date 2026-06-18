"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search, RefreshCw, Clock, User, Target, MessageSquare } from "lucide-react";
import Link from "next/link";

interface AdminLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const size = 50;

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/admin-logs?page=${p}&size=${size}${q ? `&action=${encodeURIComponent(q)}` : ""}`);
      const d = await res.json();
      if (d.success) { setLogs(d.data.items); setTotal(d.data.total); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Admin Logları</h1><p className="mt-1 text-sm text-gray-500">Tüm admin işlem kayıtları</p></div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="İşlem ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load(1, search)}
              />
            </div>
          </div>
          <button onClick={() => load()} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
            <RefreshCw size={12} /> Yenile
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Henüz log kaydı yok</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kullanıcı</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İşlem</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hedef</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />{new Date(log.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <span className="font-medium text-gray-700">{log.userName}</span>
                      </span>
                      <span className="text-[10px] text-gray-400 block ml-4">{log.userId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Target size={12} className="text-gray-400" />{log.target || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} className="text-gray-400" />{log.detail || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Toplam {total} kayıt (sayfa {page}/{totalPages})</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Geri</button>
              <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">İleri</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
