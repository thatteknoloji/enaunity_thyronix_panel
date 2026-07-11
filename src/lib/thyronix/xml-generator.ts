import type { FeedTemplate } from "./templates";
import type { FeedOutputVariant } from "./feed-output-prep";

interface ThyronixProduct {
  id: string; externalId?: string | null; name: string; description?: string | null; brand?: string | null;
  category?: string | null; barcode?: string | null; stockCode?: string | null;
  modelCode?: string | null; price: number; costPrice?: number | null; stock: number;
  discountedPrice?: number | null; salePrice?: number | null;
  currency?: string | null; image?: string | null; images?: string | null;
  weight?: number | null; dimensions?: string | null; status?: string | null;
  vatRate?: number | null; deliveryTime?: string | null;
  manufacturer?: string | null; warranty?: string | null;
  shippingCost?: number | null; productUrl?: string | null;
}

const ALWAYS_EMIT_FIELDS = new Set(["stock", "vatRate"]);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(str: string): string {
  return `<![CDATA[${str}]]>`;
}

function formatField(value: unknown, fieldName: string, cdataFields: string[]): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  if (cdataFields.includes(fieldName)) return cdata(str);
  return escapeXml(str);
}

function getField(product: ThyronixProduct, fieldName: string): unknown {
  const map: Record<string, unknown> = {
    name: product.name, description: product.description, brand: product.brand,
    category: product.category, barcode: product.barcode, stockCode: product.stockCode,
    externalId: product.externalId,
    modelCode: product.modelCode, price: product.price, costPrice: product.costPrice,
    discountedPrice: product.discountedPrice, salePrice: product.salePrice,
    stock: product.stock, currency: product.currency, image: product.image,
    images: product.images, weight: product.weight, dimensions: product.dimensions,
    status: product.status, vatRate: product.vatRate, deliveryTime: product.deliveryTime,
    manufacturer: product.manufacturer, warranty: product.warranty,
    shippingCost: product.shippingCost, productUrl: product.productUrl,
  };
  return map[fieldName];
}

function variantFieldTags(template: FeedTemplate) {
  if (template.id === "jetteknoloji" || template.id === "ticimax") {
    return {
      barcode: "barkod",
      sku: "stokKodu",
      price: "fiyat",
      stock: "stokAdedi",
      image: "resim",
    };
  }
  if (template.id === "bezos") {
    return {
      barcode: "barkod",
      sku: "stok_kodu",
      price: "fiyat",
      stock: "stok",
      image: "resim",
    };
  }
  return {
    barcode: "barcode",
    sku: "sku",
    price: "price",
    stock: "stock",
    image: "image",
  };
}

function optionTagName(group: string): string {
  const normalized = group
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]/gi, "");
  if (normalized.includes("renk") || normalized === "color") return "renk";
  if (normalized.includes("beden") || normalized.includes("size")) return "beden";
  return group.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "_").toLowerCase() || "secenek";
}

function writeVariantBlock(
  parts: string[],
  template: FeedTemplate,
  variants: FeedOutputVariant[],
) {
  const { variantElement, variantItemElement } = template;
  if (!variantElement || variants.length === 0) return;

  const tags = variantFieldTags(template);
  parts.push(`    <${variantElement}>`);
  for (const variant of variants) {
    parts.push(`      <${variantItemElement || "variant"}>`);
    if (variant.barcode) parts.push(`        <${tags.barcode}>${escapeXml(variant.barcode)}</${tags.barcode}>`);
    if (variant.sku) parts.push(`        <${tags.sku}>${escapeXml(variant.sku)}</${tags.sku}>`);
    if (variant.price !== undefined && Number.isFinite(variant.price)) {
      parts.push(`        <${tags.price}>${variant.price}</${tags.price}>`);
    }
    parts.push(`        <${tags.stock}>${variant.stock ?? 0}</${tags.stock}>`);
    if (variant.image) parts.push(`        <${tags.image}>${escapeXml(variant.image)}</${tags.image}>`);
    if (variant.options.length > 0) {
      parts.push(`        <options>${escapeXml(JSON.stringify(variant.options))}</options>`);
      for (const opt of variant.options) {
        const tag = optionTagName(opt.group);
        parts.push(`        <${tag}>${escapeXml(opt.value)}</${tag}>`);
      }
    }
    parts.push(`      </${variantItemElement || "variant"}>`);
  }
  parts.push(`    </${variantElement}>`);
}

export function generateFeedXml(
  products: (ThyronixProduct & { variants?: FeedOutputVariant[] })[],
  template: FeedTemplate,
): string {
  const { rootElement, itemElement, fieldMap, cdataFields, xmlHeader, variantElement } = template;
  const parts: string[] = [];

  if (xmlHeader) parts.push(xmlHeader);
  parts.push(`<${rootElement}>`);

  for (const product of products) {
    parts.push(`  <${itemElement}>`);

    for (const [internalField, xmlTag] of Object.entries(fieldMap)) {
      if (!xmlTag) continue;
      const value = getField(product, internalField);

      if (template.id === "googleshopping" && internalField === "stock") {
        parts.push(`    <${xmlTag}>${value ? "in_stock" : "out_of_stock"}</${xmlTag}>`);
        continue;
      }
      if (template.id === "googleshopping" && internalField === "currency") continue;
      if (template.id === "facebook" && internalField === "stock") {
        parts.push(`    <${xmlTag}>${value ? "in stock" : "out of stock"}</${xmlTag}>`);
        continue;
      }

      if (ALWAYS_EMIT_FIELDS.has(internalField)) {
        const outValue =
          value === null || value === undefined || value === ""
            ? internalField === "stock"
              ? 0
              : 0
            : value;
        parts.push(`    <${xmlTag}>${formatField(outValue, internalField, cdataFields)}</${xmlTag}>`);
        continue;
      }

      if (value !== null && value !== undefined && value !== "") {
        const formatted = formatField(value, internalField, cdataFields);
        parts.push(`    <${xmlTag}>${formatted}</${xmlTag}>`);
      }
    }

    if (variantElement && product.variants && product.variants.length > 0) {
      writeVariantBlock(parts, template, product.variants);
    }

    parts.push(`  </${itemElement}>`);
  }

  parts.push(`</${rootElement}>`);
  return parts.join("\n");
}

export function generateFeedXmlResponse(
  products: (ThyronixProduct & { variants?: FeedOutputVariant[] })[],
  template: FeedTemplate,
): Response {
  const xml = generateFeedXml(products, template);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
