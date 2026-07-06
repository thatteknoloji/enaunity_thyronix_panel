"use client";

import { Button } from "@/components/ui/button";
import {
  RULES_FIELD_META,
  extraBrandAliasesToText,
  rulesFromForm,
} from "@/lib/products/xml-feed/mapping-fields";
import type { XmlFeedRules } from "@/lib/products/xml-feed/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  rules: XmlFeedRules;
  extraBrandAliasesText: string;
  onRulesChange: (r: XmlFeedRules) => void;
  onExtraBrandAliasesTextChange: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function XmlFeedRulesStep({
  rules,
  extraBrandAliasesText,
  onRulesChange,
  onExtraBrandAliasesTextChange,
  onBack,
  onNext,
}: Props) {
  const sampleBase = 100;
  const sampleSale = Math.round(sampleBase * rules.priceMultiplier * 100) / 100;

  const updateRule = <K extends keyof XmlFeedRules>(key: K, value: XmlFeedRules[K]) => {
    onRulesChange(rulesFromForm({ ...rules, [key]: value }, extraBrandAliasesText));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
        Örnek: {sampleBase} TL alış × {rules.priceMultiplier} = <strong>{sampleSale} TL</strong> satış fiyatı
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Dönüşüm Kuralları</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {RULES_FIELD_META.map((meta) => {
            const key = meta.key;
            const value = rules[key];

            if (meta.type === "boolean") {
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => updateRule(key, e.target.checked as XmlFeedRules[typeof key])}
                  />
                  <span>{meta.label}</span>
                </label>
              );
            }

            if (meta.type === "select" && meta.options) {
              return (
                <div key={key}>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">{meta.label}</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={String(value)}
                    onChange={(e) => updateRule(key, e.target.value as XmlFeedRules[typeof key])}
                  >
                    {meta.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {meta.hint && <p className="mt-0.5 text-[10px] text-gray-400">{meta.hint}</p>}
                </div>
              );
            }

            if (meta.type === "textarea") {
              return (
                <div key={key} className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">{meta.label}</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                    value={extraBrandAliasesText}
                    onChange={(e) => {
                      onExtraBrandAliasesTextChange(e.target.value);
                      onRulesChange(rulesFromForm(rules, e.target.value));
                    }}
                  />
                </div>
              );
            }

            return (
              <div key={key}>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">{meta.label}</label>
                <input
                  type={meta.type === "number" ? "number" : "text"}
                  min={meta.type === "number" ? meta.min : undefined}
                  max={meta.type === "number" ? meta.max : undefined}
                  step={meta.type === "number" ? meta.step : undefined}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={value as string | number}
                  onChange={(e) => {
                    const next = meta.type === "number"
                      ? Number(e.target.value)
                      : e.target.value;
                    updateRule(key, next as XmlFeedRules[typeof key]);
                  }}
                />
                {meta.hint && <p className="mt-0.5 text-[10px] text-gray-400">{meta.hint}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
        <Button onClick={onNext}>
          Önizleme Oluştur <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function initExtraBrandAliasesText(rules: XmlFeedRules): string {
  return extraBrandAliasesToText(rules.extraBrandAliases);
}
