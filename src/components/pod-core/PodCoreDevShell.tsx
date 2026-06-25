"use client";

import { useState } from "react";
import { PodCoreProvider } from "@/components/pod-core/pod-core-context";
import { PodDebugPanel } from "@/components/pod-core/PodDebugPanel";
import { PodDesignerCanvas } from "@/components/pod-core/PodDesignerCanvas";
import { PodExportDialog } from "@/components/pod-core/PodExportDialog";
import { PodHistoryPanel } from "@/components/pod-core/PodHistoryPanel";
import { PodLayerPanel } from "@/components/pod-core/PodLayerPanel";
import { PodMockupPreview } from "@/components/pod-core/PodMockupPreview";
import { PodPricingPanel } from "@/components/pod-core/PodPricingPanel";
import { PodPrintAreaPanel } from "@/components/pod-core/PodPrintAreaPanel";
import { PodToolbar } from "@/components/pod-core/PodToolbar";
import { PodUploadPanel } from "@/components/pod-core/PodUploadPanel";
import { PodVariantSelector } from "@/components/pod-core/PodVariantSelector";
import { POD_CORE_VERSION } from "@/lib/pod-core/pod-types";

type DevTab = "canvas" | "print-area" | "mockup" | "export" | "pricing" | "debug";

const TABS: { id: DevTab; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "pricing", label: "Pricing" },
  { id: "print-area", label: "Print Area" },
  { id: "mockup", label: "Mockup" },
  { id: "export", label: "Export" },
  { id: "debug", label: "Debug" },
];

export function PodCoreDevShell() {
  const [tab, setTab] = useState<DevTab>("canvas");

  return (
    <PodCoreProvider>
      <div className="space-y-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
            Geliştirme · Feature Flag
          </p>
          <h1 className="text-2xl font-bold text-ena-text">POD Core Dev</h1>
          <p className="text-sm text-ena-light/70 mt-1">
            {POD_CORE_VERSION} — mevcut PodDesignerWorkspace etkilenmez
          </p>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-ena-border pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                  : "text-ena-light/70 hover:text-ena-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "canvas" && (
          <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_240px] gap-4">
            <aside className="space-y-5 rounded-xl border border-ena-border bg-white/5 p-4">
              <PodToolbar />
              <PodUploadPanel />
              <PodHistoryPanel />
            </aside>
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="space-y-5 rounded-xl border border-ena-border bg-white/5 p-4">
              <PodVariantSelector />
              <PodPricingPanel />
              <PodLayerPanel />
            </aside>
          </div>
        )}

        {tab === "pricing" && (
          <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_300px] gap-4">
            <aside className="space-y-5 rounded-xl border border-ena-border bg-white/5 p-4">
              <PodVariantSelector />
              <PodToolbar />
            </aside>
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="rounded-xl border border-ena-border bg-white/5 p-4">
              <PodPricingPanel />
            </aside>
          </div>
        )}

        {tab === "print-area" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="rounded-xl border border-ena-border bg-white/5 p-4 space-y-4">
              <PodPrintAreaPanel />
              <PodVariantSelector />
            </aside>
          </div>
        )}

        {tab === "mockup" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="rounded-xl border border-ena-border bg-white/5 p-4 space-y-4">
              <PodVariantSelector />
              <PodMockupPreview />
            </aside>
          </div>
        )}

        {tab === "export" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="rounded-xl border border-ena-border bg-white/5 p-4">
              <PodExportDialog />
            </aside>
          </div>
        )}

        {tab === "debug" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
            <main className="min-w-0">
              <PodDesignerCanvas />
            </main>
            <aside className="rounded-xl border border-ena-border bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">Debug</p>
              <PodDebugPanel />
            </aside>
          </div>
        )}
      </div>
    </PodCoreProvider>
  );
}
