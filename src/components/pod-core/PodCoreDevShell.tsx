"use client";

import { PodCoreProvider } from "@/components/pod-core/pod-core-context";
import { PodDesignerCanvas } from "@/components/pod-core/PodDesignerCanvas";
import { PodExportDialog } from "@/components/pod-core/PodExportDialog";
import { PodHistoryPanel } from "@/components/pod-core/PodHistoryPanel";
import { PodLayerPanel } from "@/components/pod-core/PodLayerPanel";
import { PodMockupPreview } from "@/components/pod-core/PodMockupPreview";
import { PodToolbar } from "@/components/pod-core/PodToolbar";
import { PodUploadPanel } from "@/components/pod-core/PodUploadPanel";
import { PodVariantSelector } from "@/components/pod-core/PodVariantSelector";
import { POD_CORE_VERSION } from "@/lib/pod-core/pod-types";

export function PodCoreDevShell() {
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
            <PodLayerPanel />
            <PodExportDialog />
            <PodMockupPreview />
            <PodVariantSelector />
          </aside>
        </div>
      </div>
    </PodCoreProvider>
  );
}
