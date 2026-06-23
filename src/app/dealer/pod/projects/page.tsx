"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Sparkles } from "lucide-react";

type Project = {
  id: string;
  status: string;
  previewUrl: string;
  mockupThumbnailUrl: string;
  mockupUrl: string;
  design: { title: string; thumbnailUrl: string };
  template: { name: string; category: string };
  updatedAt: string;
};

export default function DealerPodProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/pod/projects?limit=50");
    const d = await r.json();
    if (d.success) setProjects(d.data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Projelerim</h1>
          <p className="text-sm text-ena-light/60 mt-1">Yerleştirme, mockup ve store ready projeler</p>
        </div>
        <Link
          href="/dealer/pod/designs?new=1"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={14} /> Yeni Proje
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400" size={24} /></div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-ena-light/50">Henüz proje yok.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-ena-border bg-ena-card/40 overflow-hidden">
              <div className="aspect-square bg-black/30">
                {(p.mockupThumbnailUrl || p.previewUrl || p.design.thumbnailUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.mockupThumbnailUrl || p.previewUrl || p.design.thumbnailUrl}
                    alt={p.design.title}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium text-white truncate">{p.design.title}</p>
                <p className="text-[10px] text-ena-light/50">{p.template.name}</p>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                  p.status === "STORE_READY" ? "bg-emerald-500/20 text-emerald-300" :
                  p.status === "MOCKUP_READY" ? "bg-violet-500/20 text-violet-300" :
                  "bg-ena-border text-ena-light/60"
                }`}>{p.status}</span>
                {p.mockupUrl && (
                  <p className="text-[10px] text-ena-light/40 flex items-center gap-1">
                    <Sparkles size={10} /> Mockup hazır
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
