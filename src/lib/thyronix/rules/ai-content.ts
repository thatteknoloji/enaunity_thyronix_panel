import { prisma } from "@/lib/db";
import { aiCall } from "../ai-service";
import { resolveAiProviderId } from "../ai-provider-resolve";
import { parseFieldLocks } from "../field-lock";
import { applyContentRulesToRow } from "./content-apply";
import { resolveRulesForSource } from "./resolver";
import type { ThyronixAiRules } from "./types";

export type AiContentField = "name" | "description";

const TITLE_SYSTEM =
  "You are a professional Turkish e-commerce copywriter. Optimize product titles for SEO and readability. Never invent specs or claims. Return ONLY the title text, no quotes.";
const DESC_SYSTEM =
  "You are a professional Turkish e-commerce copywriter. Write concise SEO product descriptions. Use only provided facts. Return ONLY the description text.";

function buildTitlePrompt(product: {
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  barcode: string | null;
}): string {
  return [
    "Ürün başlığı oluştur veya iyileştir:",
    `Mevcut başlık: ${product.name}`,
    product.brand ? `Marka: ${product.brand}` : "",
    product.category ? `Kategori: ${product.category}` : "",
    product.barcode ? `Barkod: ${product.barcode}` : "",
    product.description ? `Açıklama özeti: ${product.description.slice(0, 400)}` : "",
    "Kurallar: Türkçe, 80-120 karakter hedef, model kodlarını koru, uydurma özellik ekleme.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDescriptionPrompt(product: {
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
}): string {
  return [
    "Ürün açıklaması yaz:",
    `Başlık: ${product.name}`,
    product.brand ? `Marka: ${product.brand}` : "",
    product.category ? `Kategori: ${product.category}` : "",
    product.description ? `Mevcut: ${product.description.slice(0, 500)}` : "",
    "Kurallar: Türkçe, 2-4 paragraf, HTML yok, sadece verilen bilgiler.",
  ]
    .filter(Boolean)
    .join("\n");
}

function finalizeAiText(
  field: AiContentField,
  raw: string,
  product: Record<string, unknown>,
  rules: ThyronixAiRules,
): string {
  const row =
    field === "name"
      ? applyContentRulesToRow({ ...product, name: raw.trim() }, rules)
      : applyContentRulesToRow({ ...product, description: raw.trim() }, rules);
  return field === "name" ? String(row.name) : String(row.description || "");
}

export async function applyAiContentToProduct(
  productId: string,
  opts: {
    dealerId: string | null;
    providerId?: string | null;
    fields?: AiContentField[];
    rules?: ThyronixAiRules;
  },
): Promise<{ updated: boolean; fields: AiContentField[]; error?: string }> {
  const product = await prisma.thyronixProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      sourceId: true,
      name: true,
      description: true,
      brand: true,
      category: true,
      barcode: true,
      lockedFields: true,
    },
  });
  if (!product) return { updated: false, fields: [], error: "Ürün bulunamadı" };

  const bundle = opts.rules ?? (await resolveRulesForSource(product.sourceId)).ai;
  if (!bundle.enabled) {
    return { updated: false, fields: [], error: "AI kuralları kapalı" };
  }

  const providerId = await resolveAiProviderId({
    providerId: opts.providerId,
    dealerId: opts.dealerId,
  });
  if (!providerId) {
    return {
      updated: false,
      fields: [],
      error: "AI sağlayıcı tanımlı değil — Ayarlar → Yapay Zeka API",
    };
  }

  const locks = parseFieldLocks(product.lockedFields);
  const fields = opts.fields ?? (["name", "description"] as AiContentField[]);
  const updates: Record<string, string | null> = {};
  const applied: AiContentField[] = [];

  for (const field of fields) {
    if (field === "name" && locks.name) continue;
    if (field === "description" && locks.description) continue;

    const result = await aiCall({
      providerId,
      task: field === "name" ? "title_optimize" : "description_generate",
      productId: product.id,
      systemPrompt: field === "name" ? TITLE_SYSTEM : DESC_SYSTEM,
      userPrompt:
        field === "name"
          ? buildTitlePrompt(product)
          : buildDescriptionPrompt(product),
      temperature: 0.5,
      maxTokens: field === "name" ? 256 : 1024,
    });

    if (!result.success || !result.content.trim()) continue;

    const value = finalizeAiText(field, result.content, product as unknown as Record<string, unknown>, bundle);
    if (field === "name" && value) {
      updates.name = value;
      applied.push("name");
    }
    if (field === "description" && value) {
      updates.description = value;
      applied.push("description");
    }
  }

  if (!applied.length) {
    return { updated: false, fields: [], error: "Güncellenecek alan yok veya AI yanıt vermedi" };
  }

  await prisma.thyronixProduct.update({
    where: { id: productId },
    data: updates,
  });

  return { updated: true, fields: applied };
}

export async function applyAiContentBatch(opts: {
  productIds: string[];
  dealerId: string | null;
  providerId?: string | null;
  fields?: AiContentField[];
  maxItems?: number;
}): Promise<{
  processed: number;
  updated: number;
  skipped: number;
  errors: Array<{ productId: string; error: string }>;
}> {
  const limit = Math.min(opts.maxItems ?? 50, opts.productIds.length);
  const ids = opts.productIds.slice(0, limit);
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ productId: string; error: string }> = [];

  for (const id of ids) {
    const result = await applyAiContentToProduct(id, {
      dealerId: opts.dealerId,
      providerId: opts.providerId,
      fields: opts.fields,
    });
    if (result.updated) updated++;
    else if (result.error) {
      skipped++;
      errors.push({ productId: id, error: result.error });
    } else skipped++;
  }

  return { processed: ids.length, updated, skipped, errors };
}

export async function applyAiToNewProductsAfterSync(
  sourceId: string,
  externalIds: string[],
  dealerId: string | null,
  maxItems = 15,
): Promise<number> {
  if (!externalIds.length || !dealerId) return 0;
  const rules = (await resolveRulesForSource(sourceId)).ai;
  if (!rules.enabled || !rules.autoOnNewProducts) return 0;

  const products = await prisma.thyronixProduct.findMany({
    where: { sourceId, externalId: { in: externalIds.slice(0, maxItems) } },
    select: { id: true },
    take: maxItems,
  });

  let count = 0;
  for (const p of products) {
    const r = await applyAiContentToProduct(p.id, { dealerId, fields: ["name", "description"], rules });
    if (r.updated) count++;
  }
  return count;
}
