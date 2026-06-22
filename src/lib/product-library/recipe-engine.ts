import type { ProductCatalogItem } from "@prisma/client";
import type {
  ProductPackageFieldRule,
  ProductPackageRecipeValue,
} from "./types";
import { readItemAttributes } from "./template-engine";

type ExportCell = string | number;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundValue(value: number, step?: number) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

function applyNumberFormula(value: number, recipe: ProductPackageRecipeValue | undefined) {
  if (!recipe) return value;
  const formulaType = recipe.formulaType || "SET";
  const formulaValue = Number(recipe.formulaValue ?? 0);

  let next = value;
  if (formulaType === "SET") next = formulaValue || value;
  if (formulaType === "ADD") next = value + formulaValue;
  if (formulaType === "MULTIPLY") next = value * (formulaValue || 1);
  if (formulaType === "PERCENT") next = value * (1 + formulaValue / 100);

  if (typeof recipe.minValue === "number") next = Math.max(next, recipe.minValue);
  next = roundValue(next, recipe.roundTo);
  return Number(next.toFixed(2));
}

function getRawItemValue(item: ProductCatalogItem, rule: ProductPackageFieldRule) {
  if (rule.source === "CORE") {
    return (item as Record<string, unknown>)[rule.key];
  }
  const attrs = readItemAttributes(item);
  return attrs[rule.key] ?? "";
}

function applyRule(
  value: unknown,
  rule: ProductPackageFieldRule,
  recipe: ProductPackageRecipeValue | undefined
): ExportCell {
  if (rule.dataType === "number") {
    const base = toNumber(value);
    if (rule.behavior === "NUMBER_FORMULA") return applyNumberFormula(base, recipe);
    if (rule.behavior === "REPLACE" && recipe?.value) return toNumber(recipe.value);
    return base;
  }

  const base = String(value ?? "");
  if (rule.behavior === "REPLACE" && recipe?.value) return recipe.value;
  if (rule.behavior === "PREFIX" && recipe?.prefix) return `${recipe.prefix}${base}`;
  if (rule.behavior === "SUFFIX" && recipe?.suffix) return `${base}${recipe.suffix}`;
  return base;
}

export function buildRecipeExportRows(params: {
  items: ProductCatalogItem[];
  fieldRules: ProductPackageFieldRule[];
  recipeValues?: Record<string, ProductPackageRecipeValue>;
}) {
  const { items, recipeValues = {} } = params;
  const fieldRules = params.fieldRules.filter((rule) => rule.visible !== false && rule.behavior !== "HIDDEN");
  const rows: Record<string, ExportCell>[] = [];
  const warnings = new Set<string>();

  for (const item of items) {
    const row: Record<string, ExportCell> = {};
    for (const rule of fieldRules) {
      const raw = getRawItemValue(item, rule);
      const next = applyRule(raw, rule, recipeValues[rule.key]);
      if (rule.required && String(next ?? "").trim() === "") {
        warnings.add(`${rule.label} alanı bazı satırlarda boş kaldı.`);
      }
      row[rule.exportKey || rule.key] = next;
    }
    rows.push(row);
  }

  return {
    rows,
    exportKeys: fieldRules.map((rule) => rule.exportKey || rule.key),
    warnings: [...warnings],
  };
}

export function buildRecipePreview(params: {
  items: ProductCatalogItem[];
  fieldRules: ProductPackageFieldRule[];
  recipeValues?: Record<string, ProductPackageRecipeValue>;
}) {
  const built = buildRecipeExportRows(params);
  return {
    ...built,
    itemCount: built.rows.length,
    sampleRows: built.rows.slice(0, 5),
  };
}
