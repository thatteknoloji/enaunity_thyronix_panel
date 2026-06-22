import type { AeoCitationHint } from "./aeo-types";
import type { AeoProductContext } from "./aeo-utils";
import { categoryLabel, pickEntity } from "./aeo-utils";

export function generateCitationHints(
  ctx: AeoProductContext,
  metadata: Record<string, unknown>
): AeoCitationHint[] {
  const hints: AeoCitationHint[] = [];
  const importSource = (metadata.importSource as string) || ctx.product.sourceType;

  hints.push({
    sourceType: "PRODUCT_DATA",
    sourceName: "ProductUniverse",
    field: "normalizedName",
    confidence: 0.95,
  });

  if (ctx.product.descriptionClean?.trim()) {
    hints.push({
      sourceType: "PRODUCT_DATA",
      sourceName: "ProductUniverse",
      field: "descriptionClean",
      confidence: 0.88,
    });
  }

  if (importSource) {
    hints.push({
      sourceType: "SUPPLIER_FEED",
      sourceName: String(importSource),
      field: "descriptionClean",
      confidence: importSource === "THYRONIX_BRIDGE_V1" ? 0.82 : 0.75,
    });
  }

  if (ctx.product.categoryPath) {
    hints.push({
      sourceType: "CATEGORY_PATH",
      sourceName: "ProductUniverse",
      field: "categoryPath",
      confidence: 0.9,
    });
  }

  if (ctx.product.brand) {
    hints.push({
      sourceType: "BRAND",
      sourceName: ctx.product.brand,
      field: "brand",
      confidence: 0.85,
    });
  }

  if (ctx.images.length) {
    hints.push({
      sourceType: "IMAGE_SOURCE",
      sourceName: "ProductImage",
      field: "images[0].url",
      confidence: 0.8,
    });
  }

  const cat = categoryLabel(ctx.product.categoryPath);
  if (cat) {
    hints.push({
      sourceType: "INTERNAL_PAGE",
      sourceName: "category",
      field: "categoryPath",
      confidence: 0.7,
    });
  }

  const theme = pickEntity(ctx.entities, "THEME");
  if (theme) {
    hints.push({
      sourceType: "ENTITY",
      sourceName: "THEME",
      field: theme,
      confidence: 0.78,
    });
  }

  if (metadata.blueprintKind) {
    hints.push({
      sourceType: "RELATED_BLUEPRINT",
      sourceName: String(metadata.blueprintKind),
      field: "blueprintKind",
      confidence: 0.65,
    });
  }

  const seen = new Set<string>();
  return hints.filter((h) => {
    const key = `${h.sourceType}:${h.field}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
