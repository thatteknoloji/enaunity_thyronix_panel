"use client";

import { useEffect, useState } from "react";
import { Brain, FlaskConical } from "lucide-react";

type BrainStatus = {
  activeProvider: string | null;
  model: string | null;
  ready: boolean;
  brainVersion: string;
  lastRun: string | null;
  lastError: string | null;
};

export function AiBrainStatusCard() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/ai-brain/status");
    const json = await res.json();
    if (json.success) setStatus(json.data);
    const jobs = await fetch("/api/admin/jobs?limit=50");
    const j = await jobs.json();
    if (j.success) {
      const scores = (j.data || [])
        .map((x: any) => {
          try {
            const m = JSON.parse(x.metadataJson || "{}");
            return Number(m.finalQualityScore || 0);
          } catch {
            return 0;
          }
        })
        .filter((n: number) => n > 0);
      setAvgScore(scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runTest = async () => {
    setTesting(true);
    await fetch("/api/admin/ai-brain/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "BLOG", keyword: "cam tablo bayiliği", province: "İstanbul" }),
    });
    setTesting(false);
    await load();
  };

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" />
          Akıllı İçerik Beyni
        </h3>
        <button
          onClick={() => void runTest()}
          disabled={testing}
          className="text-xs px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Test üretimi
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
        <div><span className="text-gray-500">Provider:</span> {status?.activeProvider || "—"}</div>
        <div><span className="text-gray-500">Model:</span> {status?.model || "—"}</div>
        <div><span className="text-gray-500">Hazır:</span> {status?.ready ? "Evet" : "Hayır"}</div>
        <div><span className="text-gray-500">Son üretim:</span> {status?.lastRun ? new Date(status.lastRun).toLocaleString("tr-TR") : "—"}</div>
        <div><span className="text-gray-500">Son hata:</span> {status?.lastError || "—"}</div>
        <div><span className="text-gray-500">Ort. kalite:</span> {avgScore}</div>
      </div>
    </div>
  );
}
