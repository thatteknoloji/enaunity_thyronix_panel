"use client";

import { listMockupTemplates } from "@/lib/pod-core/mockup-template-registry";
import { usePodCore } from "./pod-core-context";

export function PodVariantSelector() {
  const { mockupTemplate, setMockupTemplate } = usePodCore();
  const templates = listMockupTemplates();

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Mockup Template</p>
      <select
        value={mockupTemplate.id}
        onChange={(e) => {
          const tpl = templates.find((t) => t.id === e.target.value);
          if (tpl) setMockupTemplate(tpl);
        }}
        className="w-full rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-xs"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.category} — {t.name} ({t.variant})
          </option>
        ))}
      </select>
    </div>
  );
}
