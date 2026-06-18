"use client";

import { useEffect, useState } from "react";
import { Clock, Play, Pause, XCircle, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-nexa-text-secondary/10 text-nexa-text-secondary",
  running: "bg-nexa-primary/10 text-nexa-primary",
  paused: "bg-nexa-warning/10 text-nexa-warning",
  completed: "bg-nexa-success/10 text-nexa-success",
  failed: "bg-nexa-danger/10 text-nexa-danger",
  cancelled: "bg-nexa-text-secondary/10 text-nexa-text-secondary",
};

const TASK_LABELS: Record<string, string> = {
  title_optimize: "Başlık Optimize",
  description_generate: "Açıklama Oluştur",
  category_suggest: "Kategori Öner",
  attribute_extract: "Özellik Çıkar",
  quality_improve: "Kalite İyileştir",
};

export default function ThyronixAiJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = () => {
    fetch("/api/thyronix/ai/jobs").then(r => r.json()).then(d => { if (d.success) setJobs(d.data); setLoading(false); });
  };
  useEffect(() => { fetchJobs(); }, []);

  const handleAction = async (id: string, action: string) => {
    const res = await fetch(`/api/thyronix/ai/jobs/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    const d = await res.json();
    if (d.success) { toast.success("İşlem başarılı"); fetchJobs(); } else { toast.error(d.error || "Hata"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/thyronix/ai/jobs/${id}`, { method: "DELETE" });
    toast.success("Silindi"); fetchJobs();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2"><Clock size={24} className="text-nexa-primary" /> AI Görev Merkezi</h1><p className="text-sm text-nexa-text-secondary mt-1">Toplu AI işlemlerinin durum takibi</p></div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left text-nexa-text-secondary">Görev</th>
            <th className="px-4 py-3 text-left text-nexa-text-secondary hidden md:table-cell">Tip</th>
            <th className="px-4 py-3 text-center text-nexa-text-secondary">Durum</th>
            <th className="px-4 py-3 text-center text-nexa-text-secondary hidden md:table-cell">İlerleme</th>
            <th className="px-4 py-3 text-right text-nexa-text-secondary hidden md:table-cell">Token</th>
            <th className="px-4 py-3 text-right text-nexa-text-secondary hidden md:table-cell">Maliyet</th>
            <th className="px-4 py-3 text-right text-nexa-text-secondary">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr> :
              jobs.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-nexa-text-secondary">Henüz görev yok</td></tr> :
                jobs.map(j => (
                  <tr key={j.id} className="hover:bg-nexa-hover">
                    <td className="px-4 py-3"><div><p className="font-medium text-nexa-text">{j.name}</p><p className="text-[10px] text-nexa-text-secondary">{j.model} • {new Date(j.createdAt).toLocaleString("tr-TR")}</p></div></td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-nexa-text-secondary">{TASK_LABELS[j.taskType] || j.taskType}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[j.status] || ""}`}>{j.status}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-center text-xs text-nexa-text-secondary">{j.processedCount}/{j.totalProducts}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-right text-xs text-nexa-text-secondary">{j.actualTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-right text-xs text-nexa-text-secondary">${j.actualCost.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right">
                      {j.status === "running" && <button onClick={() => handleAction(j.id, "pause")} className="px-1.5 py-1 text-nexa-warning hover:bg-nexa-warning/10 rounded text-xs" title="Duraklat"><Pause size={12} /></button>}
                      {j.status === "paused" && <button onClick={() => handleAction(j.id, "resume")} className="px-1.5 py-1 text-nexa-success hover:bg-nexa-success/10 rounded text-xs" title="Devam"><Play size={12} /></button>}
                      {(j.status === "running" || j.status === "paused") && <button onClick={() => handleAction(j.id, "cancel")} className="px-1.5 py-1 text-nexa-danger hover:bg-nexa-danger/10 rounded text-xs" title="İptal"><XCircle size={12} /></button>}
                      {(j.status === "failed" || j.status === "completed") && j.failedCount > 0 && <button onClick={() => handleAction(j.id, "retry_failed")} className="px-1.5 py-1 text-nexa-primary hover:bg-nexa-primary/10 rounded text-xs" title="Başarısızları dene"><RotateCcw size={12} /></button>}
                      <button onClick={() => handleDelete(j.id)} className="px-1.5 py-1 text-nexa-text-secondary hover:text-nexa-danger text-xs"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
