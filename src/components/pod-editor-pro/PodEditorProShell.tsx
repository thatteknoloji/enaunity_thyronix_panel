"use client";

import { Suspense, useEffect } from "react";
import { PodCoreProvider, usePodCore } from "@/components/pod-core/pod-core-context";
import { PodUrlBootstrap } from "@/components/pod-core/PodUrlBootstrap";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { PodEditorCanvasWorkspace } from "./PodEditorCanvasWorkspace";
import { PodEditorLeftPanel } from "./PodEditorLeftPanel";
import { PodEditorRightPanel, type RightPanelTab } from "./PodEditorRightPanel";
import { PodEditorStatusBar } from "./PodEditorStatusBar";
import { PodEditorTopBar } from "./PodEditorTopBar";
import { usePodEditorActions } from "./usePodEditorActions";
import { useState } from "react";

type Props = {
  role?: PodUiRole;
};

function PodEditorProInner({ role }: { role: PodUiRole }) {
  const [rightTab, setRightTab] = useState<RightPanelTab>("properties");
  const { saveProject } = usePodEditorActions();
  const { selectedObjectIds } = usePodCore();

  useEffect(() => {
    if (selectedObjectIds.length) setRightTab("properties");
  }, [selectedObjectIds]);

  useEffect(() => {
    const t = setInterval(() => {
      void saveProject().catch(() => undefined);
    }, 90_000);
    return () => clearInterval(t);
  }, [saveProject]);

  return (
    <div className="pod-editor-pro-root flex flex-col flex-1 min-h-[min(720px,calc(100vh-6rem))] rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/30 bg-[#0f1117]">
      <PodEditorTopBar role={role} onTabChange={setRightTab} />
      <div className="flex flex-1 min-h-0">
        <PodEditorLeftPanel role={role} />
        <PodEditorCanvasWorkspace />
        <PodEditorRightPanel tab={rightTab} onTabChange={setRightTab} />
      </div>
      <PodEditorStatusBar />
      <style jsx global>{`
        .pod-editor-pro-root { container-type: inline-size; }
        .pod-editor-pro-panel .text-ena-text,
        .pod-editor-pro-panel .text-ena-light,
        .pod-editor-pro-panel label,
        .pod-editor-pro-panel p,
        .pod-editor-pro-panel span,
        .pod-editor-pro-panel dt,
        .pod-editor-pro-panel dd { color: rgba(255, 255, 255, 0.75); }
        .pod-editor-pro-panel .text-ena-light\\/50,
        .pod-editor-pro-panel .text-ena-light\\/60,
        .pod-editor-pro-panel .text-ena-light\\/70 { color: rgba(255, 255, 255, 0.4) !important; }
        .pod-editor-pro-panel .text-emerald-600,
        .pod-editor-pro-panel .text-emerald-700,
        .pod-editor-pro-panel .text-emerald-800 { color: rgb(52, 211, 153) !important; }
        .pod-editor-pro-panel .border-ena-border { border-color: rgba(255, 255, 255, 0.1); }
        .pod-editor-pro-panel .bg-white\\/5 { background: rgba(255, 255, 255, 0.05); }
        .pod-editor-pro-panel input,
        .pod-editor-pro-panel select {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.12);
        }
        @media (max-width: 1600px) { .pod-editor-pro-root .pod-right-panel { width: 260px; } }
        @media (max-width: 1440px) { .pod-editor-pro-root .pod-right-panel { width: 240px; } }
        @media (max-width: 1366px) { .pod-editor-pro-root .pod-right-panel { width: 220px; } }
        @media (max-width: 1280px) { .pod-editor-pro-root .pod-right-panel { width: 200px; } }
      `}</style>
    </div>
  );
}

export function PodEditorProShell({ role = "admin" }: Props) {
  return (
    <PodCoreProvider studioRole={role}>
      <Suspense fallback={null}>
        <PodUrlBootstrap />
      </Suspense>
      <PodEditorProInner role={role} />
    </PodCoreProvider>
  );
}
