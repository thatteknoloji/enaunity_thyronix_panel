"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { POD_CORE_SOURCE } from "@/lib/pod-core/pod-types";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { podBasePath } from "@/lib/pod-core/pod-ui-bridge";

type ProjectOption = {
  projectId: string;
  projectName: string;
  templateName: string;
};

type Props = {
  role: PodUiRole;
};

export function PodProductionPanel({ role }: Props) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const base = podBasePath(role);

  useEffect(() => {
    fetch(`/api/pod/projects?source=${POD_CORE_SOURCE}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProjects(
            (d.data.items || []).map((p: ProjectOption & { templateName?: string }) => ({
              projectId: p.projectId,
              projectName: p.projectName,
              templateName: p.templateName || "—",
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const createPack = useCallback(async () => {
    if (!selectedId) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await fetch("/api/pod/create-production-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedId }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Üretim dosyası oluşturulamadı");
      setMessage("Production pack oluşturuldu (production.png, preview.png, metadata.json).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }, [selectedId]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Üretim Dosyası</h1>
        <p className="text-sm text-ena-light/60 mt-1">
          Kayıtlı projeden production pack oluşturun.
        </p>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-emerald-400" size={24} />
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ena-border p-8 text-center">
          <p className="text-sm text-ena-light">Önce bir tasarım kaydedin.</p>
          <Link href={`${base}/designs?new=1`} className="text-sm text-emerald-400 hover:underline mt-2 inline-block">
            Tasarım oluştur →
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-ena-border bg-ena-card/30 p-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-ena-light">Proje seç</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-ena-border bg-ena-bg px-3 py-2 text-sm text-white"
            >
              <option value="">Seçin</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName} — {p.templateName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedId || busy}
            onClick={createPack}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
            Production pack oluştur
          </button>
          {message ? <p className="text-xs text-ena-light">{message}</p> : null}
        </div>
      )}
    </div>
  );
}
