"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, FileText, ReceiptText } from "lucide-react";
import { DealerPanel, DealerSubPage } from "@/components/dealer/DealerSubPage";

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
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatements(await api("/api/my/statements"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const now = new Date();
      const result = await api<{ lines: any[] }>(
        `/api/my/statements?generate=true&year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      setLines(result.lines || []);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ekstre üretilemedi");
    } finally {
      setGenerating(false);
    }
  };

  const viewStatement = (s: any) => {
    try {
      setLines(JSON.parse(s.linesJson || "[]"));
    } catch {
      setLines([]);
    }
  };

  return (
    <DealerSubPage
      title="Ekstrelerim"
      description="Aylık cari hesap ekstreleri ve hareket detayları"
      icon={ReceiptText}
      maxWidth="xl"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="text-xs px-3 py-1.5 bg-ena-primary text-white rounded-lg disabled:opacity-50"
          >
            {generating ? "Üretiliyor…" : "Bu Ay Üret"}
          </button>
          <button
            type="button"
            onClick={load}
            className="text-xs text-ena-light flex items-center gap-1 px-2 py-1.5 border border-white/10 rounded-lg hover:bg-white/5"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      }
    >
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-xl bg-ena-card/40" />
          <div className="h-16 rounded-xl bg-ena-card/40" />
        </div>
      ) : (
        <div className="space-y-6">
          <DealerPanel className="divide-y divide-white/10">
            {statements.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full p-4 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                onClick={() => viewStatement(s)}
              >
                <div className="flex items-center gap-2 text-white">
                  <FileText size={14} className="text-ena-primary" /> {s.periodMonth}/{s.periodYear}
                </div>
                <span className="text-sm text-ena-light">Bakiye: {fmt(s.closingBalance)}</span>
              </button>
            ))}
            {statements.length === 0 && (
              <p className="p-6 text-sm text-ena-light text-center">Henüz ekstre yok. &quot;Bu Ay Üret&quot; ile oluşturabilirsiniz.</p>
            )}
          </DealerPanel>

          {lines.length > 0 && (
            <DealerPanel className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-ena-light text-xs">
                    <th className="p-3 text-left font-medium">Tarih</th>
                    <th className="p-3 text-left font-medium">İşlem</th>
                    <th className="p-3 text-right font-medium">Borç</th>
                    <th className="p-3 text-right font-medium">Alacak</th>
                    <th className="p-3 text-right font-medium">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-t border-white/10 text-white">
                      <td className="p-3">{new Date(l.date).toLocaleDateString("tr-TR")}</td>
                      <td className="p-3 text-ena-light">{l.title}</td>
                      <td className="p-3 text-right text-red-400">{l.debit > 0 ? fmt(l.debit) : "—"}</td>
                      <td className="p-3 text-right text-emerald-400">{l.credit > 0 ? fmt(l.credit) : "—"}</td>
                      <td className="p-3 text-right">{fmt(l.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DealerPanel>
          )}
        </div>
      )}
    </DealerSubPage>
  );
}
