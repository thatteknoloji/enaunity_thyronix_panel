"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type AiWriterStatus = {
  configuredProviders: string[];
  activeProvider: string | null;
  model: string | null;
  ready: boolean;
  lastGeneration: string | null;
  lastError: string | null;
  lastWordCount: number | null;
};

export function AiWriterStatusCard() {
  const [status, setStatus] = useState<AiWriterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson<AiWriterStatus>("/api/admin/ai-writer/status");
      if (d.success && d.data) setStatus(d.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const d = await fetchPageFactoryJson<{
        title?: string;
        wordCount?: number;
        validation?: { passed: boolean; issues: string[] };
        error?: string;
      }>("/api/admin/ai-writer/test-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "BLOG", keyword: "cam tablo bayiliği", province: "İstanbul" }),
      });
      if (d.success && d.data) {
        const v = d.data.validation;
        setTestResult(
          v?.passed
            ? `✓ Test OK — ${d.data.wordCount} kelime, "${d.data.title}"`
            : `⚠ Üretim tamamlandı ama doğrulama geçmedi: ${v?.issues?.join(", ") || d.data.error}`
        );
      } else {
        setTestResult(`✗ ${d.error || d.data?.error || "Test başarısız"}`);
      }
      load();
    } catch (e) {
      setTestResult(`✗ ${e instanceof Error ? e.message : "Hata"}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Akıllı İçerik Yazarı yükleniyor…
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-violet-600" />
          <h3 className="font-semibold text-sm">Akıllı İçerik Yazarı</h3>
        </div>
        {status?.ready ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={14} /> Hazır
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={14} /> Provider yok
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <span className="text-gray-400">Provider:</span>{" "}
          {status?.activeProvider || "—"}
        </div>
        <div>
          <span className="text-gray-400">Model:</span> {status?.model || "—"}
        </div>
        <div>
          <span className="text-gray-400">Son üretim:</span>{" "}
          {status?.lastGeneration ? new Date(status.lastGeneration).toLocaleString("tr-TR") : "—"}
        </div>
        <div>
          <span className="text-gray-400">Son kelime:</span> {status?.lastWordCount ?? "—"}
        </div>
      </div>

      {status?.lastError && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 truncate" title={status.lastError}>
          Son hata: {status.lastError}
        </p>
      )}

      <button
        type="button"
        onClick={runTest}
        disabled={testing}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        Test Üretimi
      </button>

      {testResult && <p className="text-xs text-gray-700">{testResult}</p>}
    </div>
  );
}
