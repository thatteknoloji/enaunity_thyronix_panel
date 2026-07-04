import { XMLParser } from "fast-xml-parser";
import type { FeedTemplate } from "./templates";
import { guessProductField } from "./field-aliases";
import { buildSourceMetadataJson, safeJsonStringify } from "./source-metadata";
import { parseThyronixNumber } from "./number";

interface ThyronixProductInput {
  name?: string; description?: string; brand?: string; category?: string;
  barcode?: string; stockCode?: string; modelCode?: string; externalId?: string;
  price?: number; discountedPrice?: number; salePrice?: number; costPrice?: number; stock?: number; currency?: string;
  image?: string; images?: string; weight?: number; dimensions?: string;
  status?: string; vatRate?: number; deliveryTime?: string;
  manufacturer?: string; warranty?: string; shippingCost?: number; productUrl?: string;
  variantData?: string;
  metadataJson?: string;
  variants?: Array<{
    barcode?: string; sku?: string; price?: number; stock?: number;
    image?: string; options?: Array<{ group: string; value: string }>;
  }>;
}

type VariantFieldMap = Record<string, string>;

export type XmlInspectionResult = {
  totalItems: number;
  detectedFields: string[];
  sampleValues: Record<string, string>;
  variantFields: string[];
  variantSampleValues: Record<string, string>;
};

function buildReverseMap(fieldMap: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, xmlTag] of Object.entries(fieldMap)) {
    if (xmlTag) map[xmlTag] = key;
  }
  return map;
}

function parseNumber(val: unknown): number | undefined {
  return parseThyronixNumber(val) ?? undefined;
}

function pickNestedNumber(value: unknown, keys: string[]): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  const text = record["#text"];
  if (text !== undefined) return text;
  const firstScalar = Object.values(record).find((item) => item !== null && item !== undefined && typeof item !== "object");
  return firstScalar ?? value;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function extractText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "#text" in value) {
    const text = (value as Record<string, unknown>)["#text"];
    return text === null || text === undefined ? "" : String(text).trim();
  }
  return String(value).trim();
}

function pickAliasedItemValue(item: Record<string, unknown>, targetField: string): unknown {
  for (const [key, value] of Object.entries(item)) {
    if (guessProductField(key) === targetField) return value;
  }
  return undefined;
}

function pickPositiveNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed !== undefined && parsed > 0) return parsed;
  }
  return undefined;
}

function getNestedRecord(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function normalizeArray(value: unknown): Record<string, unknown>[] {
  const rawItems = Array.isArray(value) ? value : value ? [value] : [];
  return rawItems.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function getOptionItems(item: Record<string, unknown>): Record<string, unknown>[] {
  const container =
    item.UrunSecenek ??
    item.urunSecenek ??
    item.urun_secenek ??
    item.options ??
    item.Options ??
    item.variants ??
    item.Variants;
  if (!container || typeof container !== "object") return [];
  const nested =
    getNestedRecord(container, "Secenek") ??
    getNestedRecord(container, "secenek") ??
    getNestedRecord(container, "Option") ??
    getNestedRecord(container, "option") ??
    getNestedRecord(container, "Variant") ??
    getNestedRecord(container, "variant");
  return normalizeArray(nested ?? container);
}

function resolveVariantFieldKey(variant: Record<string, unknown>, rawField: string): string | undefined {
  if (rawField in variant) return rawField;
  const lower = rawField.toLowerCase();
  const keys = Object.keys(variant);
  return keys.find((key) => key.toLowerCase() === lower);
}

export function findXmlItems(parsed: unknown, template: FeedTemplate): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  if (Array.isArray(parsed)) return parsed;

  let root = (parsed as Record<string, unknown>)[template.rootElement];
  if (!root || typeof root !== "object") {
    for (const val of Object.values(parsed as Record<string, unknown>)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const nested = (val as Record<string, unknown>)[template.rootElement];
        if (nested && typeof nested === "object") {
          root = nested;
          break;
        }
      }
    }
  }
  if (root && typeof root === "object") {
    const items = (root as Record<string, unknown>)[template.itemElement];
    if (items) return Array.isArray(items) ? items : [items];
    for (const val of Object.values(root as Record<string, unknown>)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val;
    }
  }

  const direct = (parsed as Record<string, unknown>)[template.itemElement];
  if (direct) return Array.isArray(direct) ? direct : [direct];

  for (const val of Object.values(parsed as Record<string, unknown>)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val;
  }

  return [];
}

export function inspectXmlFeed(xml: string, template: FeedTemplate): XmlInspectionResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const items = findXmlItems(parsed, template);
  const detectedFields = new Set<string>();
  const sampleValues: Record<string, string> = {};
  const variantFields = new Set<string>();
  const variantSampleValues: Record<string, string> = {};
  const variantTags = new Set([
    template.variantElement,
    "variants",
    "variant",
    "Varyantlar",
    "varyant",
    "Variants",
    "Variant",
    "UrunSecenek",
    "urunSecenek",
    "Secenek",
    "secenek",
    "VARIANTS",
    "variaciones",
    "variations",
  ].filter(Boolean) as string[]);
  const variantItemTags = new Set([
    template.variantItemElement,
    "variant",
    "Variant",
    "item",
    "varyant",
    "Varyant",
    "variation",
    "Variation",
    "Secenek",
    "secenek",
    "Option",
    "option",
  ].filter(Boolean) as string[]);

  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = items[i] as Record<string, unknown>;
    for (const key of Object.keys(item)) {
      if (key.startsWith("@") || key === "#text") continue;
      detectedFields.add(key);
      if (!sampleValues[key]) {
        const raw = item[key];
        sampleValues[key] =
          typeof raw === "object" && raw !== null
            ? Array.isArray(raw)
              ? `[${raw.length} items]`
              : `{${Object.keys(raw as Record<string, unknown>).filter((innerKey) => !innerKey.startsWith("@")).length} alt alan}`
            : String(raw || "").substring(0, 80);
      }
    }

    const variantContainerKey = Object.keys(item).find((key) => variantTags.has(key));
    if (!variantContainerKey) continue;
    const variantContainer = item[variantContainerKey];
    if (!variantContainer || typeof variantContainer !== "object") continue;

    let variantItems: unknown[] = [];
    if (Array.isArray(variantContainer)) {
      variantItems = variantContainer;
    } else {
      const containerObject = variantContainer as Record<string, unknown>;
      const nestedKey = Object.keys(containerObject).find((key) => variantItemTags.has(key) || Array.isArray(containerObject[key]));
      if (nestedKey) {
        const nestedValue = containerObject[nestedKey];
        variantItems = Array.isArray(nestedValue) ? nestedValue : nestedValue ? [nestedValue] : [];
      } else {
        variantItems = [containerObject];
      }
    }

    for (const variant of variantItems) {
      if (!variant || typeof variant !== "object") continue;
      for (const key of Object.keys(variant as Record<string, unknown>)) {
        if (key.startsWith("@") || key === "#text") continue;
        variantFields.add(key);
        if (!variantSampleValues[key]) {
          const raw = (variant as Record<string, unknown>)[key];
          variantSampleValues[key] =
            typeof raw === "object" && raw !== null
              ? Array.isArray(raw)
                ? `[${raw.length} items]`
                : `{${Object.keys(raw as Record<string, unknown>).filter((innerKey) => !innerKey.startsWith("@")).length} alt alan}`
              : String(raw || "").substring(0, 80);
        }
      }
    }
  }

  return {
    totalItems: items.length,
    detectedFields: [...detectedFields],
    sampleValues,
    variantFields: [...variantFields],
    variantSampleValues,
  };
}

export function parseXmlToProducts(
  xml: string,
  template: FeedTemplate,
  customFieldMap?: Record<string, string>,
  variantFieldMap?: VariantFieldMap,
): ThyronixProductInput[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  
  // Merge template fieldMap with custom overrides
  const effectiveMap: Record<string, string> = { ...(template.fieldMap as any as Record<string, string>) };
  if (customFieldMap) {
    for (const [xmlField, thyronixField] of Object.entries(customFieldMap)) {
      for (const [key, val] of Object.entries(effectiveMap)) {
        if (val === xmlField) delete effectiveMap[key];
      }
      effectiveMap[thyronixField] = xmlField;
    }
  }
  
  const reverseMap = buildReverseMap(effectiveMap);

  const items = findXmlItems(parsed, template);

  return items.map((item: any, idx: number) => {
    const product: ThyronixProductInput = {};
    const optionItems = getOptionItems(item);
    const firstOption = optionItems[0];

    // Map fields from XML to internal
    for (const [xmlTag, internalField] of Object.entries(reverseMap)) {
      let value = item[xmlTag];
      if (value === undefined) continue;
      // Handle nested text nodes from XML parser
      if (typeof value === "object" && value !== null && "#text" in value) {
        value = value["#text"];
      }

      // Handle image container objects (e.g., <resimler><resim>url</resim></resimler>)
      if (internalField === "images" || internalField === "image") {
        if (typeof value === "object" && value !== null) {
          const imgKey = Object.keys(value as object).find(k => !k.startsWith("#") && !k.startsWith("@"));
          if (imgKey && Array.isArray((value as any)[imgKey])) {
            value = (value as any)[imgKey]
              .map((r: any) => (typeof r === "object" && r["#text"]) ? r["#text"] : String(r))
              .join(",");
          } else if (imgKey) {
            const r = (value as any)[imgKey];
            value = (typeof r === "object" && r["#text"]) ? r["#text"] : String(r);
          } else {
            continue;
          }
        }
      }

      const numFields = ["price", "discountedPrice", "salePrice", "costPrice", "stock", "weight", "vatRate", "shippingCost"];
      if (numFields.includes(internalField)) {
        if (typeof value === "object" && value !== null) {
          if (internalField === "price" || internalField === "discountedPrice" || internalField === "salePrice" || internalField === "costPrice") {
            value = pickNestedNumber(value, [
              "bayi_fiyati", "son_kullanici", "SatisFiyati", "satisFiyati", "sitePrice",
              "listPrice", "price", "Price", "fiyat", "Fiyat",
            ]);
          } else if (internalField === "stock") {
            value = pickNestedNumber(value, ["miktar", "Miktar", "quantity", "Quantity", "stok", "Stok", "stock", "Stock"]);
          } else if (internalField === "vatRate") {
            value = pickNestedNumber(value, ["kdv", "KDV", "Kdv", "kdvOrani", "KdvOrani", "tax", "Tax", "vat", "Vat", "rate", "Rate"]);
          } else {
            value = pickNestedNumber(value, []);
          }
        }
        const n = parseNumber(value);
        if (n !== undefined) (product as any)[internalField] = n;
      } else if (internalField === "image" || internalField === "images") {
        (product as any)[internalField] = String(value);
      } else {
        (product as any)[internalField] = String(value);
      }
    }

    if (!product.price || product.price <= 0) {
      const p =
        item.price ?? item.sitePrice ?? item.SatisFiyati ?? item.Price ??
        item.urun_fiyat_bayi_ozel ?? item.urun_fiyat ?? pickAliasedItemValue(item, "price");
      const fiyat = item.fiyat;
      const fromFiyat = fiyat && typeof fiyat === "object"
        ? pickNestedNumber(fiyat, ["bayi_fiyati", "son_kullanici", "SatisFiyati", "price", "fiyat"])
        : fiyat;
      product.price =
        pickPositiveNumber(
          p,
          fromFiyat,
          item.salePrice,
          item.sale_price,
          item.satis_fiyati,
          item.alis_fiyat,
          item.AlisFiyati,
          firstOption?.IndirimliFiyat,
          firstOption?.indirimliFiyat,
          firstOption?.SatisFiyati,
          firstOption?.satisFiyati,
          firstOption?.Fiyat,
          firstOption?.fiyat,
          firstOption?.AlisFiyati,
          firstOption?.alisFiyati,
        ) ?? product.price;
    }
    if (product.discountedPrice === undefined) {
      product.discountedPrice = pickPositiveNumber(firstOption?.IndirimliFiyat, firstOption?.indirimliFiyat);
    }
    if (product.costPrice === undefined) {
      product.costPrice = pickPositiveNumber(
        item.alis_fiyat,
        item.AlisFiyati,
        firstOption?.AlisFiyati,
        firstOption?.alisFiyati,
      );
    }
    if (product.vatRate === undefined) {
      product.vatRate = parseNumber(
        item.kdv ?? item.KDV ?? item.Kdv ?? item.kdvOrani ?? item.KdvOrani ??
        item.KDVOrani ?? item.vat ?? item.Vat ?? item.vatRate ?? item.VatRate ??
        item.tax_rate ?? item.TaxRate ?? item.taxRate ??
        firstOption?.KdvOrani ?? firstOption?.kdvOrani ?? firstOption?.KDV ?? firstOption?.kdv ??
        pickAliasedItemValue(item, "vatRate")
      );
    }
    if (product.stock === undefined) {
      const optionStock = optionItems.reduce(
        (sum, option) =>
          sum +
          (parseNumber(
            option.StokAdedi ?? option.stokAdedi ?? option.stok_adedi ?? option.stock ?? option.Stock ?? option.quantity ?? option.miktar,
          ) ?? 0),
        0,
      );
      product.stock =
        parseNumber(item.quantity ?? item.miktar ?? item.StokAdedi ?? item.stok ?? item.urun_stok) ?? optionStock;
    }
    if (!product.name) {
      product.name =
        String(item.adi ?? item.ProductName ?? item.UrunAdi ?? item.urun_ad ?? item.name ?? pickAliasedItemValue(item, "name") ?? "").trim() ||
        undefined;
    }
    if (!product.barcode) {
      product.barcode =
        String(
          item.barcode ??
            item.barcod ??
            item.Barkod ??
            item.ozel_barkod_kodu ??
            firstOption?.Barkod ??
            firstOption?.barkod ??
            pickAliasedItemValue(item, "barcode") ??
            "",
        ).trim() || undefined;
    }
    if (!product.stockCode) {
      product.stockCode =
        String(
          item.stok_kodu ??
            item.ProductCode ??
            item.StokKodu ??
            item.ozel_urun_kodu ??
            firstOption?.StokKodu ??
            firstOption?.stokKodu ??
            pickAliasedItemValue(item, "stockCode") ??
            "",
        ).trim() ||
        undefined;
    }
    if (!product.brand) {
      product.brand = String(item.urun_marka_ad ?? item.marka ?? pickAliasedItemValue(item, "brand") ?? "").trim() || undefined;
    }
    if (!product.category) {
      product.category =
        String(item.urun_kategori_path ?? item.urun_kategori_ad ?? item.kategori ?? pickAliasedItemValue(item, "category") ?? "").trim() || undefined;
    }
    if (!product.image) {
      product.image =
        String(item.urun_resim1 ?? item.resim1 ?? "").trim() || product.image;
    }
    if (!product.image && item.resim && typeof item.resim === "object") {
      const r = item.resim as Record<string, unknown>;
      product.image = String(r.resim1 ?? r.image1 ?? Object.values(r).find((v) => typeof v === "string") ?? "").trim() || undefined;
    }

    if (!product.externalId) {
      product.externalId =
        pickString(
          item.externalId,
          item.external_id,
          item.externalID,
          item.id,
          item.ID,
          item.urun_id,
          item.product_id,
          item.UrunKartiID,
          item.urunKartiId,
          item.VaryasyonID,
          pickAliasedItemValue(item, "externalId"),
        ) || undefined;
    }

    // Parse variants using template config first, then generic auto-detection.
    const variantContainerKey = [
      template.variantElement,
      "variants",
      "Variants",
      "Varyantlar",
      "varyantlar",
      "variations",
      "VARIANTS",
      "UrunSecenek",
      "urunSecenek",
      "urun_secenek",
      "variant",
      "Variant",
    ].find((key) => key && item[key]);

    if (variantContainerKey) {
      const variantsContainer = item[variantContainerKey];
      const nestedVariantKey =
        template.variantItemElement ||
        (typeof variantsContainer === "object" && variantsContainer
          ? Object.keys(variantsContainer).find((key) =>
              ["variant", "Variant", "varyant", "Varyant", "variation", "Variation", "Secenek", "secenek", "Option", "option"].includes(key) ||
              Array.isArray((variantsContainer as Record<string, unknown>)[key])
            )
          : undefined) ||
        "variant";
      const variantItems = Array.isArray((variantsContainer as Record<string, unknown> | undefined)?.[nestedVariantKey])
        ? (variantsContainer as Record<string, unknown>)[nestedVariantKey] as unknown[]
        : ((variantsContainer as Record<string, unknown> | undefined)?.[nestedVariantKey]
          ? [(variantsContainer as Record<string, unknown>)[nestedVariantKey]]
          : (Array.isArray(variantsContainer) ? variantsContainer : [variantsContainer]).filter(Boolean));

      product.variants = variantItems.map((vi: any) => {
        let variantBarcode = vi.barcode || vi.Barcode || vi.BARKOD || vi.Barkod || vi.barkod;
        let variantSku = vi.sku || vi.Sku || vi.SKU || vi.StokKodu || vi.stokKodu || vi.stok_kodu;
        let variantPrice = pickPositiveNumber(
          vi.IndirimliFiyat,
          vi.indirimliFiyat,
          vi.price,
          vi.Price,
          vi.satilacakFiyat,
          vi.SatisFiyati,
          vi.satisFiyati,
          vi.fiyat,
          vi.Fiyat,
          vi.AlisFiyati,
          vi.alisFiyati,
        );
        let variantStock = parseNumber(vi.stock || vi.Stock || vi.stok || vi.quantity || vi.StokAdedi || vi.miktar || vi.Miktar) ?? 0;
        let variantImage = vi.image || vi.Image || vi.Resim || vi.resim;
        const variantOpts: Array<{ group: string; value: string }> = [];
        let mappedVariantGroup = "";
        let mappedVariantValue = "";
        const consumedKeys = new Set<string>([
          "barcode", "Barcode", "BARKOD", "Barkod",
          "sku", "Sku", "SKU", "StokKodu", "stokKodu", "stok_kodu",
          "price", "Price", "satilacakFiyat", "SatisFiyati", "satisFiyati", "fiyat", "Fiyat", "IndirimliFiyat", "indirimliFiyat", "AlisFiyati", "alisFiyati",
          "stock", "Stock", "stok", "quantity", "StokAdedi", "miktar", "Miktar",
          "image", "Image", "Resim", "resim",
          "KdvOrani", "kdvOrani", "KDV", "kdv", "ParaBirimi", "ParaBirimiKodu", "Desi",
        ]);

        if (variantFieldMap && typeof variantFieldMap === "object") {
          for (const [rawField, role] of Object.entries(variantFieldMap)) {
            const matchedKey = resolveVariantFieldKey(vi, rawField);
            if (!matchedKey) continue;
            consumedKeys.add(matchedKey);
            consumedKeys.add(rawField);
            if (!role || role === "variantIgnore") continue;
            const rawValue = extractText(vi[matchedKey]);
            if (!rawValue) continue;
            switch (role) {
              case "variantBarcode":
                variantBarcode = rawValue;
                break;
              case "variantSku":
                variantSku = rawValue;
                break;
              case "variantPrice":
                variantPrice = pickPositiveNumber(rawValue) ?? variantPrice;
                break;
              case "variantStock":
                variantStock = parseNumber(rawValue) ?? variantStock;
                break;
              case "variantImage":
                variantImage = rawValue;
                break;
              case "variantGroup":
                mappedVariantGroup = rawValue;
                break;
              case "variantValue":
                mappedVariantValue = rawValue;
                if (!mappedVariantGroup) mappedVariantGroup = rawField;
                break;
              default:
                break;
            }
          }
        }

        if (mappedVariantGroup && mappedVariantValue) {
          variantOpts.push({ group: mappedVariantGroup, value: mappedVariantValue });
        }

        // Check for name1/value1, name2/value2 ... pattern (Leyna-style)
        let nameIdx = 1;
        while (vi[`name${nameIdx}`] || vi[`Name${nameIdx}`]) {
          const nk = vi[`name${nameIdx}`] || vi[`Name${nameIdx}`];
          const vk = vi[`value${nameIdx}`] || vi[`Value${nameIdx}`];
          const name = typeof nk === "object" && nk?.["#text"] ? nk["#text"] : String(nk || "");
          const val = typeof vk === "object" && vk?.["#text"] ? vk["#text"] : String(vk || "");
          if (name) variantOpts.push({ group: name, value: val });
          nameIdx++;
        }

        // Check for attribute-style: <attribute name="Renk">Siyah</attribute>
        if (variantOpts.length === 0 && (vi["attribute"] || vi["Attribute"] || vi["attributes"] || vi["Attributes"])) {
          const attrs = vi["attribute"] || vi["Attribute"] || vi["attributes"] || vi["Attributes"];
          const attrItems = Array.isArray(attrs) ? attrs : [attrs].filter(Boolean);
          for (const attr of attrItems) {
            const attrName = attr["@_name"] || attr["name"] || attr["Name"] || attr["@_key"];
            const attrValue = attr["#text"] || attr["value"] || attr["Value"] || attr["@_value"];
            const n = typeof attrName === "object" && attrName?.["#text"] ? attrName["#text"] : String(attrName || "");
            const v = typeof attrValue === "object" && attrValue?.["#text"] ? attrValue["#text"] : String(attrValue || "");
            if (n) variantOpts.push({ group: n, value: v });
          }
        }

        // Check for option-style: <option><group>Renk</group><value>Siyah</value></option>
        if (variantOpts.length === 0 && (vi["option"] || vi["Option"] || vi["options"] || vi["Options"])) {
          const opts = vi["option"] || vi["Option"] || vi["options"] || vi["Options"];
          const optItems = Array.isArray(opts) ? opts : [opts].filter(Boolean);
          for (const opt of optItems) {
            const g = opt["group"] || opt["Group"] || opt["name"] || opt["Name"] || opt["key"];
            const va = opt["value"] || opt["Value"] || opt["val"] || opt["#text"];
            const gn = typeof g === "object" && g?.["#text"] ? g["#text"] : String(g || "");
            const vl = typeof va === "object" && va?.["#text"] ? va["#text"] : String(va || "");
            if (gn) variantOpts.push({ group: gn, value: vl });
          }
        }

        // Ticimax-style: <EkSecenekOzellik><Ozellik Tanim="Renk" Deger="Siyah"/></EkSecenekOzellik>
        if (variantOpts.length === 0 && vi.EkSecenekOzellik && typeof vi.EkSecenekOzellik === "object") {
          const ozellik = (vi.EkSecenekOzellik as Record<string, unknown>).Ozellik;
          const ozellikItems = Array.isArray(ozellik) ? ozellik : ozellik ? [ozellik] : [];
          for (const opt of ozellikItems) {
            if (!opt || typeof opt !== "object") continue;
            const record = opt as Record<string, unknown>;
            const group = extractText(record["@_Tanim"] ?? record.Tanim ?? record.name ?? record["@_name"]);
            const value = extractText(record["@_Deger"] ?? record.Deger ?? record.value ?? record["@_value"] ?? record["#text"]);
            if (group && value) variantOpts.push({ group, value });
          }
        }

        // Check for spec-style: <spec name="Renk" value="Siyah"/> or <specName>Renk</specName><specValue>Siyah</specValue>
        if (variantOpts.length === 0) {
          // Try specCode, specName, etc
          for (let si = 1; si <= 10; si++) {
            const sk = vi[`specName${si}`] || vi[`spec${si}`] || vi[`specCode${si}`];
            const sv = vi[`specValue${si}`];
            if (sk) {
              const sname = typeof sk === "object" && sk?.["#text"] ? sk["#text"] : String(sk);
              // specValue might not exist, use spec itself as value
              if (sv) {
                const sval = typeof sv === "object" && sv?.["#text"] ? sv["#text"] : String(sv);
                variantOpts.push({ group: sname, value: sval });
              }
            }
          }
        }

        // Fallback: try to find label/value pairs from non-standard keys
        if (variantOpts.length === 0) {
          for (const [k, v] of Object.entries(vi)) {
            if (consumedKeys.has(k)) continue;
            if (k.startsWith("@_")) continue;
            if (k === "#text") continue;
            if (/^(name|value|Name|Value|spec|Spec|attr|Attr)\d*$/.test(k)) continue;
            if (v == null) continue;
            const val = typeof v === "object" && (v as any)["#text"] ? (v as any)["#text"] : String(v);
            if (val) variantOpts.push({ group: k, value: val });
          }
        }

        return { barcode: variantBarcode, sku: variantSku, price: variantPrice, stock: variantStock || 0, image: variantImage, options: variantOpts };
      });
    }

    const rawVariants = Array.isArray(product.variants) ? product.variants : [];
    if ((!product.price || product.price <= 0) && rawVariants.length > 0) {
      product.price = pickPositiveNumber(...rawVariants.map((variant) => variant.price)) ?? product.price;
    }
    product.variantData = rawVariants.length > 0 ? safeJsonStringify(rawVariants, "[]") : undefined;
    product.metadataJson = buildSourceMetadataJson({
      sourceType: "xml",
      templateId: template.id,
      raw: item,
      extra: {
        itemIndex: idx,
        variantCount: rawVariants.length,
        externalId: product.externalId || null,
      },
    });

    if (product.variants && product.variants.length > 0) {
      if (product.metadataJson) {
        try {
          const parsed = JSON.parse(product.metadataJson) as Record<string, unknown>;
          product.metadataJson = safeJsonStringify({ ...parsed, variantCount: product.variants.length }, "{}");
        } catch {
          /* keep existing metadataJson */
        }
      }
    }

    return product;
  }).filter((product) =>
    Boolean(product.name || product.barcode || product.stockCode || product.modelCode || product.externalId)
  );
}
