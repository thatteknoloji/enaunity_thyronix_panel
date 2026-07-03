import type { FeedTemplate } from "./templates";

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

interface ThyronixVariant {
  id: string; sku?: string; barcode?: string; price?: number;
  stock: number; options: string | Array<{ group: string; value: string }>; image?: string;
}

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

export function generateFeedXml(
  products: (ThyronixProduct & { variants?: ThyronixVariant[] })[],
  template: FeedTemplate,
  inlineStock?: boolean,
): string {
  const { rootElement, itemElement, fieldMap, cdataFields, xmlHeader, variantElement, variantItemElement } = template;
  const parts: string[] = [];

  if (xmlHeader) parts.push(xmlHeader);
  parts.push(`<${rootElement}>`);

  for (const product of products) {
    parts.push(`  <${itemElement}>`);

    for (const [internalField, xmlTag] of Object.entries(fieldMap)) {
      if (!xmlTag) continue;
      const value = getField(product, internalField);

      // Google Shopping / Facebook: special handling
      if (template.id === "googleshopping" && internalField === "stock") {
        parts.push(`    <${xmlTag}>${value ? "in_stock" : "out_of_stock"}</${xmlTag}>`);
        continue;
      }
      if (template.id === "googleshopping" && internalField === "currency") continue;
      if (template.id === "facebook" && internalField === "stock") {
        parts.push(`    <${xmlTag}>${value ? "in stock" : "out of stock"}</${xmlTag}>`);
        continue;
      }

      if (value !== null && value !== undefined && value !== "") {
        const formatted = formatField(value, internalField, cdataFields);
        parts.push(`    <${xmlTag}>${formatted}</${xmlTag}>`);
      }
    }

    // Variants
    if (variantElement && product.variants && product.variants.length > 0) {
      parts.push(`    <${variantElement}>`);
      for (const v of product.variants) {
        let variantOpts: Array<{ group: string; value: string }> = [];
        if (Array.isArray(v.options)) {
          variantOpts = v.options;
        } else {
          try { variantOpts = JSON.parse(v.options || "[]"); } catch {}
        }
        parts.push(`      <${variantItemElement || "variant"}>`);
        if (v.barcode) parts.push(`        <barcode>${escapeXml(v.barcode)}</barcode>`);
        if (v.sku) parts.push(`        <sku>${escapeXml(v.sku)}</sku>`);
        if (v.price !== undefined) parts.push(`        <price>${v.price}</price>`);
        parts.push(`        <stock>${v.stock}</stock>`);
        if (v.image) parts.push(`        <image>${escapeXml(v.image)}</image>`);
        if (variantOpts.length > 0) {
          parts.push(`        <options>${escapeXml(JSON.stringify(variantOpts))}</options>`);
          for (const opt of variantOpts) {
            const groupTag = (opt.group || "group").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            parts.push(`        <${groupTag}>${escapeXml(opt.value)}</${groupTag}>`);
          }
        }
        parts.push(`      </${variantItemElement || "variant"}>`);
      }
      parts.push(`    </${variantElement}>`);
    }

    parts.push(`  </${itemElement}>`);
  }

  parts.push(`</${rootElement}>`);
  return parts.join("\n");
}

export function generateFeedXmlResponse(
  products: (ThyronixProduct & { variants?: ThyronixVariant[] })[],
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
