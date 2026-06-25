"use client";

import { useState } from "react";
import { PodCoreProvider } from "@/components/pod-core/pod-core-context";
import { PodEditorCanvasWorkspace } from "./PodEditorCanvasWorkspace";
import { PodEditorRightPanel, type RightPanelTab } from "./PodEditorRightPanel";
import { PodEditorStatusBar } from "./PodEditorStatusBar";
import { PodEditorToolRail } from "./PodEditorToolRail";
import { PodEditorTopBar } from "./PodEditorTopBar";

export function PodEditorProShell() {
  const [rightTab, setRightTab] = useState<RightPanelTab>("product");

  return (
    <PodCoreProvider>
      <div className="flex flex-col flex-1 min-h-[600px] rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/30 bg-[#0f1117]">
        <PodEditorTopBar onTabChange={setRightTab} />
        <div className="flex flex-1 min-h-0">
          <PodEditorToolRail
            onFocusPanel={(tab) => setRightTab(tab === "layers" ? "layers" : "product")}
          />
          <PodEditorCanvasWorkspace />
          <PodEditorRightPanel tab={rightTab} onTabChange={setRightTab} />
        </div>
        <PodEditorStatusBar />
      </div>
      <style jsx global>{`
        .pod-editor-pro-panel .text-ena-text,
        .pod-editor-pro-panel .text-ena-light,
        .pod-editor-pro-panel label,
        .pod-editor-pro-panel p,
        .pod-editor-pro-panel span,
        .pod-editor-pro-panel dt,
        .pod-editor-pro-panel dd {
          color: rgba(255, 255, 255, 0.75);
        }
        .pod-editor-pro-panel .text-ena-light\\/50,
        .pod-editor-pro-panel .text-ena-light\\/60,
        .pod-editor-pro-panel .text-ena-light\\/70 {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .pod-editor-pro-panel .text-emerald-600,
        .pod-editor-pro-panel .text-emerald-700,
        .pod-editor-pro-panel .text-emerald-800 {
          color: rgb(52, 211, 153) !important;
        }
        .pod-editor-pro-panel .border-ena-border {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .pod-editor-pro-panel .bg-white\\/5 {
          background: rgba(255, 255, 255, 0.05);
        }
        .pod-editor-pro-panel input,
        .pod-editor-pro-panel select {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .pod-editor-pro-panel .bg-emerald-500\\/10 {
          background: rgba(16, 185, 129, 0.12);
        }
      `}</style>
    </PodCoreProvider>
  );
}
