"use client";

import { ImageIcon } from "lucide-react";

/** V2 — mockup preview; V1 placeholder */
export function PodMockupPreview() {
  return (
    <div className="rounded-lg border border-ena-border border-dashed bg-white/5 p-4 text-center space-y-2">
      <ImageIcon className="h-8 w-8 mx-auto text-ena-light/30" />
      <p className="text-xs font-medium text-ena-light/60">Mockup Önizleme</p>
      <p className="text-[10px] text-ena-light/40">Faz 2 — mockup-engine.ts</p>
    </div>
  );
}
