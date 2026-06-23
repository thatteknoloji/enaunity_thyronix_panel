"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  Sparkles,
  Store,
} from "lucide-react";
import { PodDesignLibrary } from "@/components/pod/PodDesignLibrary";
import { PodPlacementCanvas } from "@/components/pod/PodPlacementCanvas";
import type { PodOverlayArea, PodPlacement } from "@/lib/pod/types";
import { DEFAULT_PLACEMENT } from "@/lib/pod/types";
import { overlayFromTemplate } from "@/lib/pod/pod-design-engine";

type LibraryDesign = {
  id: string;
  title: string;
  thumbnailUrl: string;
  fileUrl?: string;
  fileType: string;
  width: number;
  height: number;
};

type Design = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};

type Template = {
  id: string;
  name: string;
  category: string;
  baseImageUrl: string;
  overlayAreaJson: string;
  printWidth: number;
  printHeight: number;
};

type Project = {
  id: string;
  status: string;
  placementJson: string;
  previewUrl: string;
  mockupUrl: string;
  mockupThumbnailUrl: string;
};

type Step = "design" | "template" | "place" | "mockup";

export function PodDesignerWorkspace() {
  const [step, setStep] = useState<Step>("design");
  const [design, setDesign] = useState<Design | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [placement, setPlacement] = useState<PodPlacement>(DEFAULT_PLACEMENT);
  const [overlay, setOverlay] = useState<PodOverlayArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pod/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTemplates(d.data || []);
      });
  }, []);

  const createProject = async (tpl: Template) => {
    if (!design) return;
    setLoading(true);
    setError(null);
    try {
      const ov = overlayFromTemplate(tpl);
      setOverlay(ov);
      const r = await fetch("/api/pod/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: design.id, templateId: tpl.id }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Proje oluşturulamadı");
      setProject(d.data);
      setTemplate(tpl);
      setPlacement(DEFAULT_PLACEMENT);
      setStep("place");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const savePlacement = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const r = await fetch("/api/pod/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, placement, action: "save" }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setProject(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setLoading(false);
    }
  }, [project, placement]);

  useEffect(() => {
    if (step !== "place" || !project) return;
    const t = setTimeout(() => {
      savePlacement();
    }, 400);
    return () => clearTimeout(t);
  }, [placement, step, project, savePlacement]);

  const generateMockup = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await savePlacement();
      const r = await fetch("/api/pod/mockup/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Mockup başarısız");
      setProject(d.data);
      setStep("mockup");
      setMessage("Mockup üretildi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mockup hatası");
    } finally {
      setLoading(false);
    }
  };

  const storeReady = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const r = await fetch("/api/pod/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, placement, action: "store_ready" }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setProject(d.data);
      setMessage("Mağazaya hazır — STORE_READY");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Store ready hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dealer/pod" className="text-ena-light/60 hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Tasarım Stüdyosu</h1>
          <p className="text-xs text-ena-light/60">Yükle → Ürün seç → Konumlandır → Mockup → Store Ready</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(["design", "template", "place", "mockup"] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`px-3 py-1 rounded-full ${step === s ? "bg-emerald-500/20 text-emerald-300" : "bg-ena-card text-ena-light/50"}`}
          >
            {i + 1}. {s === "design" ? "Tasarım" : s === "template" ? "Ürün" : s === "place" ? "Yerleştir" : "Mockup"}
          </span>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</div>}

      {step === "design" && (
        <PodDesignLibrary
          onSelect={(d) => {
            setDesign({
              id: d.id,
              title: d.title,
              fileUrl: (d as LibraryDesign).fileUrl || d.thumbnailUrl,
              thumbnailUrl: d.thumbnailUrl,
              width: d.width,
              height: d.height,
            });
            setStep("template");
          }}
        />
      )}

      {step === "template" && design && (
        <div className="space-y-4">
          <p className="text-sm text-ena-light">Seçili tasarım: <strong className="text-white">{design.title}</strong></p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={loading}
                onClick={() => createProject(t)}
                className="rounded-xl border border-ena-border bg-ena-card/40 p-3 text-left hover:border-emerald-500/40 disabled:opacity-50"
              >
                <div className="aspect-[4/3] rounded-lg bg-black/30 mb-2 overflow-hidden">
                  {t.baseImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.baseImageUrl} alt={t.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-[10px] text-ena-light/50">{t.category}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "place" && design && template && project && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PodPlacementCanvas
            templateImageUrl={template.baseImageUrl}
            designImageUrl={design.fileUrl || design.thumbnailUrl}
            designWidth={design.width || 500}
            designHeight={design.height || 500}
            overlay={overlay}
            placement={placement}
            onPlacementChange={setPlacement}
          />
          <div className="space-y-3">
            <p className="text-sm text-white font-medium">{template.name}</p>
            <p className="text-xs text-ena-light/60">Sürükleyerek konumlandırın. Ölçek ve döndürme anlık güncellenir.</p>
            <button
              type="button"
              onClick={generateMockup}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Mockup Üret
            </button>
          </div>
        </div>
      )}

      {step === "mockup" && project && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Thumbnail", url: project.mockupThumbnailUrl },
              { label: "Preview", url: project.previewUrl },
              { label: "Full", url: project.mockupUrl },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-ena-border overflow-hidden">
                <p className="text-xs text-ena-light/60 px-3 py-2 bg-ena-card/60">{m.label}</p>
                {m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.label} className="w-full aspect-square object-contain bg-black/20" />
                ) : (
                  <div className="aspect-square bg-black/20 flex items-center justify-center text-ena-light/40 text-xs">Yok</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={storeReady}
              disabled={loading || project.status === "STORE_READY"}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Store size={16} /> Mağazaya Ekle
            </button>
            <Link
              href="/dealer/pod/store"
              className="inline-flex items-center gap-2 rounded-lg border border-ena-border px-4 py-2 text-sm text-ena-light hover:bg-ena-card/40"
            >
              <Package size={16} /> Mağaza Ürünleri
            </Link>
          </div>
          {project.status === "STORE_READY" && (
            <p className="text-sm text-emerald-400">✓ STORE_READY — siparişe hazır</p>
          )}
        </div>
      )}
    </div>
  );
}
