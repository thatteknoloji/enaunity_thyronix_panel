"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, FileText } from "lucide-react";

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export default function DealerStatementsPage() {
  const [statements, setStatements] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatements(await api("/api/my/statements"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const now = new Date();
    const result = await api<{ lines: any[] }>(`/api/my/statements?generate=true&year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    setLines(result.lines || []);
    load();
  };

  const viewStatement = (s: any) => {
    try {
      setLines(JSON.parse(s.linesJson || "[]"));
    } catch {
      setLines([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dealer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <h1 className="text-lg font-bold">Ekstrelerim</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={generate} className="text-xs px-3 py-1.5 bg-ena-primary text-white rounded-lg">Bu Ay Üret</button>
          <button onClick={load} className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={14} /></button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : (
          <>
            <div className="bg-white rounded-xl border divide-y">
              {statements.map((s) => (
                <div key={s.id} className="p-4 flex justify-between cursor-pointer hover:bg-gray-50" onClick={() => viewStatement(s)}>
                  <div className="flex items-center gap-2"><FileText size={14} /> {s.periodMonth}/{s.periodYear}</div>
                  <span className="text-sm">Bakiye: {fmt(s.closingBalance)}</span>
                </div>
              ))}
              {statements.length === 0 && <p className="p-4 text-sm text-gray-500">Henüz ekstre yok.</p>}
            </div>
            {lines.length > 0 && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Tarih</th>
                      <th className="p-3 text-left">İşlem</th>
                      <th className="p-3 text-right">Borç</th>
                      <th className="p-3 text-right">Alacak</th>
                      <th className="p-3 text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{new Date(l.date).toLocaleDateString("tr-TR")}</td>
                        <td className="p-3">{l.title}</td>
                        <td className="p-3 text-right text-red-600">{l.debit > 0 ? fmt(l.debit) : "—"}</td>
                        <td className="p-3 text-right text-emerald-600">{l.credit > 0 ? fmt(l.credit) : "—"}</td>
                        <td className="p-3 text-right">{fmt(l.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
