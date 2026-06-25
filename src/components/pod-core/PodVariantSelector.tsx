"use client";

import { Shirt } from "lucide-react";

/** V2 — variant selector; V1 placeholder */
export function PodVariantSelector() {
  return (
    <div className="rounded-lg border border-ena-border border-dashed bg-white/5 p-4 text-center space-y-2">
      <Shirt className="h-8 w-8 mx-auto text-ena-light/30" />
      <p className="text-xs font-medium text-ena-light/60">Varyant Seçici</p>
      <p className="text-[10px] text-ena-light/40">Faz 2 — beden / renk / adet</p>
    </div>
  );
}
