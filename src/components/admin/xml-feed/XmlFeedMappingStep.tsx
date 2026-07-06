"use client";

import { Button } from "@/components/ui/button";
import {
  PRODUCT_MAPPING_FIELDS,
  VARIANT_MAPPING_FIELDS,
  validateProductMapping,
} from "@/lib/products/xml-feed/mapping-fields";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  templateId: string;
  mapping: Record<string, string>;
  variantMapping: Record<string, string>;
  detectedFields: string[];
  variantFields: string[];
  onMappingChange: (m: Record<string, string>) => void;
  onVariantMappingChange: (m: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
};

function MappingSelect({
  label,
  value,
  required,
  hint,
  options,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  hint?: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const uniqueOptions = [...new Set([...options, value].filter(Boolean))].sort();
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">
        {label}{required ? " *" : ""}
      </label>
      <div className="flex gap-2">
        <select
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          value={uniqueOptions.includes(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— XML tag seç —</option>
          {uniqueOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-xs"
          placeholder="veya yaz"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

export function XmlFeedMappingStep({
  templateId,
  mapping,
  variantMapping,
  detectedFields,
  variantFields,
  onMappingChange,
  onVariantMappingChange,
  onBack,
  onNext,
}: Props) {
  const errors = validateProductMapping(mapping, templateId);
  const isIkas = templateId === "ikas";
  const fieldOptions = detectedFields.length ? detectedFields : Object.values(mapping).filter(Boolean);
  const variantOptions = variantFields.length ? variantFields : Object.values(variantMapping).filter(Boolean);

  const setProduct = (key: string, xmlTag: string) => {
    onMappingChange({ ...mapping, [key]: xmlTag });
  };
  const setVariant = (key: string, xmlTag: string) => {
    onVariantMappingChange({ ...variantMapping, [key]: xmlTag });
  };

  return (
    <div className="space-y-4">
      {isIkas && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900">
          ikas şablonu alan eşlemesini otomatik yapar. Bu adımı atlayıp kurallara geçebilirsiniz.
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Ürün Alan Eşleme</h3>
        <p className="mb-4 text-xs text-gray-500">ENA alanı → XML tag (feed testinden algılanan alanlar listede)</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PRODUCT_MAPPING_FIELDS.map((field) => (
            <MappingSelect
              key={field.key}
              label={field.label}
              required={field.required}
              hint={field.hint}
              value={mapping[field.key] || ""}
              options={fieldOptions}
              onChange={(v) => setProduct(field.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Varyant Alan Eşleme</h3>
        <p className="mb-4 text-xs text-gray-500">Varyant satırları için XML tag eşlemesi (opsiyonel — Leyna otomatik algılar)</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {VARIANT_MAPPING_FIELDS.map((field) => (
            <MappingSelect
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={variantMapping[field.key] || ""}
              options={variantOptions}
              onChange={(v) => setVariant(field.key, v)}
            />
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {errors.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
        <Button onClick={onNext} disabled={errors.length > 0}>
          Kurallar <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
