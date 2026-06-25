"use client";

import { useState } from "react";
import { PodExportDialog } from "@/components/pod-core/PodExportDialog";
import { PodLayerPanel } from "@/components/pod-core/PodLayerPanel";
import { PodMockupPreview } from "@/components/pod-core/PodMockupPreview";
import { PodPricingPanel } from "@/components/pod-core/PodPricingPanel";
import { PodVariantSelector } from "@/components/pod-core/PodVariantSelector";
import { PodEditorObjectProperties } from "./PodEditorObjectProperties";

export type RightPanelTab = "product" | "price" | "layers" | "properties" | "mockup" | "export";

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: "product", label: "Ürün" },
  { id: "price", label: "Fiyat" },
  { id: "layers", label: "Katman" },
  { id: "properties", label: "Özellikler" },
  { id: "mockup", label: "Mockup" },
  { id: "export", label: "Export" },
];

type Props = {
  tab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
};

export function PodEditorRightPanel({ tab, onTabChange }: Props) {
  return (
    <aside className="w-[300px] shrink-0 border-l border-white/5 bg-[#12141a] flex flex-col">
      <div className="flex border-b border-white/5 overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "text-emerald-400 border-b-2 border-emerald-500 bg-white/[0.03]"
                : "text-white/45 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pod-editor-pro-panel">
        {tab === "product" && <PodVariantSelector />}
        {tab === "price" && <PodPricingPanel />}
        {tab === "layers" && <PodLayerPanel />}
        {tab === "properties" && <PodEditorObjectProperties />}
        {tab === "mockup" && <PodMockupPreview />}
        {tab === "export" && <PodExportDialog />}
      </div>
    </aside>
  );
}
