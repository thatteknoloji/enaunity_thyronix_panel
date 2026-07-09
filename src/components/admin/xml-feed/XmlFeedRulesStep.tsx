"use client";

import { Button } from "@/components/ui/button";
import {
  RULES_FIELD_META,
  type RuleFieldMeta,
  extraBrandAliasesToText,
  rulesFromForm,
} from "@/lib/products/xml-feed/mapping-fields";
import {
  MUSIC_INSTRUMENT_PRICE_TIERS,
  previewPriceSamples,
} from "@/lib/products/xml-feed/price-rules";
import type { XmlFeedRules, XmlPriceTier } from "@/lib/products/xml-feed/types";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

type Props = {
  rules: XmlFeedRules;
  extraBrandAliasesText: string;
  onRulesChange: (r: XmlFeedRules) => void;
  onExtraBrandAliasesTextChange: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const FLAT_RULE_KEYS = new Set([
  "priceMultiplier",
  "priceSource",
]);

export function XmlFeedRulesStep({
  rules,
  extraBrandAliasesText,
  onRulesChange,
  onExtraBrandAliasesTextChange,
  onBack,
  onNext,
}: Props) {
  const samples = previewPriceSamples(rules);

  const updateRule = <K extends keyof XmlFeedRules>(key: K, value: XmlFeedRules[K]) => {
    onRulesChange(rulesFromForm({ ...rules, [key]: value }, extraBrandAliasesText));
  };

  const updateTier = (index: number, patch: Partial<XmlPriceTier>) => {
    const next = rules.priceTiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    updateRule("priceTiers", next);
  };

  const addTier = () => {
    updateRule("priceTiers", [
      ...rules.priceTiers,
      { minPrice: 0, maxPrice: null, markupPercent: 25 },
    ]);
  };

  const removeTier = (index: number) => {
    updateRule(
      "priceTiers",
      rules.priceTiers.filter((_, i) => i !== index),
    );
  };

  const applyMusicPreset = () => {
    onRulesChange(
      rulesFromForm(
        {
          ...rules,
          priceMode: "tiered",
          priceTiers: MUSIC_INSTRUMENT_PRICE_TIERS.map((t) => ({ ...t })),
          fixedPriceAdjustment: 0,
          fixedBrand: "",
          stripBrandFromTitle: false,
          stripBrandFromDescription: false,
        },
        extraBrandAliasesText,
      ),
    );
  };

  const visibleMeta = RULES_FIELD_META.filter((meta) => {
    if (rules.priceMode === "tiered" && FLAT_RULE_KEYS.has(meta.key)) return false;
    return meta.key !== "priceMultiplier" || rules.priceMode === "flat";
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
        <div className="mb-2 font-semibold">Fiyat önizleme</div>
        <div className="flex flex-wrap gap-3">
          {samples.map((s) => (
            <span key={s.base} className="rounded-md bg-white/80 px-2 py-1">
              {s.base}₺ → <strong>{s.sale}₺</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Fiyat Motoru</h3>
          <Button type="button" size="sm" variant="outline" onClick={applyMusicPreset}>
            Müzik Aletleri Marjı
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Fiyat Modu</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={rules.priceMode}
              onChange={(e) => updateRule("priceMode", e.target.value as XmlFeedRules["priceMode"])}
            >
              <option value="flat">Sabit çarpan</option>
              <option value="tiered">Kademeli marj</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Sabit TL Ekle/Çıkar</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={rules.fixedPriceAdjustment}
              onChange={(e) => updateRule("fixedPriceAdjustment", Number(e.target.value))}
            />
            <p className="mt-0.5 text-[10px] text-gray-400">Negatif değer indirim uygular</p>
          </div>
          {rules.priceMode === "flat" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Fiyat Çarpanı</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={rules.priceMultiplier}
                onChange={(e) => updateRule("priceMultiplier", Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {rules.priceMode === "tiered" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase text-gray-500">
                  <th className="px-2 py-2">Min ₺</th>
                  <th className="px-2 py-2">Max ₺</th>
                  <th className="px-2 py-2">Marj %</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.priceTiers.map((tier, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded border border-gray-200 px-2 py-1"
                        value={tier.minPrice}
                        onChange={(e) => updateTier(index, { minPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="∞"
                        className="w-full rounded border border-gray-200 px-2 py-1"
                        value={tier.maxPrice ?? ""}
                        onChange={(e) =>
                          updateTier(index, {
                            maxPrice: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step={1}
                        className="w-full rounded border border-gray-200 px-2 py-1"
                        value={tier.markupPercent}
                        onChange={(e) => updateTier(index, { markupPercent: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeTier(index)}
                        aria-label="Kademeyi sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addTier}>
              <Plus size={14} className="mr-1" /> Kademe ekle
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Diğer Kurallar</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleMeta.map((meta) => {
            const key = meta.key;
            const value = rules[key];
            const numberMeta: Extract<RuleFieldMeta, { type: "number" }> | null =
              meta.type === "number" ? (meta as Extract<RuleFieldMeta, { type: "number" }>) : null;

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
                  min={numberMeta?.min}
                  max={numberMeta?.max}
                  step={numberMeta?.step}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={value as string | number}
                  onChange={(e) => {
                    const next = meta.type === "number" ? Number(e.target.value) : e.target.value;
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
