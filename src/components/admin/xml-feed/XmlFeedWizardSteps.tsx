"use client";

import { ChevronRight } from "lucide-react";
import { WIZARD_STEPS, type XmlWizardStep } from "./types";

export function XmlFeedWizardSteps({ step }: { step: XmlWizardStep }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
      {WIZARD_STEPS.map((s, i) => (
        <span
          key={s.id}
          className={`flex items-center gap-1 ${step === s.id ? "font-semibold text-gray-900" : ""}`}
        >
          {i > 0 && <ChevronRight size={12} />}
          {s.label.replace(/^\d+\.\s*/, "")}
        </span>
      ))}
    </div>
  );
}
