import { XMLParser } from "fast-xml-parser";
import type { FeedTemplate } from "./templates";

interface ThyronixProductInput {
  name?: string; description?: string; brand?: string; category?: string;
  barcode?: string; stockCode?: string; modelCode?: string;
  price?: number; costPrice?: number; stock?: number; currency?: string;
  image?: string; images?: string; weight?: number; dimensions?: string;
  status?: string; vatRate?: number; deliveryTime?: string;
  manufacturer?: string; warranty?: string; shippingCost?: number; productUrl?: string;
  variants?: Array<{
    barcode?: string; sku?: string; price?: number; stock?: number;
    image?: string; options?: Array<{ group: string; value: string }>;
  }>;
}

function buildReverseMap(fieldMap: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, xmlTag] of Object.entries(fieldMap)) {
    if (xmlTag) map[xmlTag] = key;
  }
  return map;
}

function parseNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const n = Number(String(val).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return isNaN(n) ? undefined : n;
}

export function parseXmlToProducts(
  xml: string,
  template: FeedTemplate,
  customFieldMap?: Record<string, string>,
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

  // Find items in the parsed XML
  const findItems = (obj: unknown): unknown[] => {
    if (!obj || typeof obj !== "object") return [];
    if (Array.isArray(obj)) return obj;

    // Try rootElement.itemElement path (top-level or one level nested e.g. Root > Urunler)
    let root = (obj as Record<string, unknown>)[template.rootElement];
    if (!root || typeof root !== "object") {
      for (const val of Object.values(obj as object)) {
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
      // If itemElement not directly found, search for arrays in root
      for (const val of Object.values(root as object)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val;
      }
    }

    // Try direct itemElement match
    const direct = (obj as any)[template.itemElement];
    if (direct) return Array.isArray(direct) ? direct : [direct];

    // Fallback: search for first array value
    for (const val of Object.values(obj as object)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val;
    }

    return [];
  };

  const items = findItems(parsed);

  return items.map((item: any, idx: number) => {
    const product: ThyronixProductInput = {};

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

      const numFields = ["price", "costPrice", "stock", "weight", "vatRate", "shippingCost"];
      if (numFields.includes(internalField)) {
        if (typeof value === "object" && value !== null) {
          if (internalField === "price" || internalField === "costPrice") {
            const nested = value as Record<string, unknown>;
            value =
              nested.bayi_fiyati ?? nested.son_kullanici ?? nested.SatisFiyati ??
              nested.price ?? nested.fiyat ?? nested["#text"];
          } else if (internalField === "stock") {
            const nested = value as Record<string, unknown>;
            value = nested.miktar ?? nested.quantity ?? nested.stok ?? nested["#text"];
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

    if (!product.price) {
      const p =
        item.price ?? item.sitePrice ?? item.SatisFiyati ?? item.Price ??
        item.urun_fiyat_bayi_ozel ?? item.urun_fiyat;
      const fiyat = item.fiyat;
      const fromFiyat = fiyat && typeof fiyat === "object"
        ? (fiyat as Record<string, unknown>).bayi_fiyati ?? (fiyat as Record<string, unknown>).son_kullanici
        : fiyat;
      product.price = parseNumber(p ?? fromFiyat) ?? product.price;
    }
    if (product.stock === undefined) {
      product.stock =
        parseNumber(item.quantity ?? item.miktar ?? item.StokAdedi ?? item.stok ?? item.urun_stok) ?? 0;
    }
    if (!product.name) {
      product.name =
        String(item.adi ?? item.ProductName ?? item.UrunAdi ?? item.urun_ad ?? item.name ?? "").trim() ||
        undefined;
    }
    if (!product.barcode && !product.stockCode) {
      product.barcode =
        String(item.barcode ?? item.barcod ?? item.Barkod ?? item.ozel_barkod_kodu ?? "").trim() || undefined;
      product.stockCode =
        String(item.stok_kodu ?? item.ProductCode ?? item.StokKodu ?? item.ozel_urun_kodu ?? "").trim() ||
        undefined;
    }
    if (!product.brand) {
      product.brand = String(item.urun_marka_ad ?? item.marka ?? "").trim() || undefined;
    }
    if (!product.category) {
      product.category =
        String(item.urun_kategori_path ?? item.urun_kategori_ad ?? item.kategori ?? "").trim() || undefined;
    }
    if (!product.image) {
      product.image =
        String(item.urun_resim1 ?? item.resim1 ?? "").trim() || product.image;
    }
    if (!product.image && item.resim && typeof item.resim === "object") {
      const r = item.resim as Record<string, unknown>;
      product.image = String(r.resim1 ?? r.image1 ?? Object.values(r).find((v) => typeof v === "string") ?? "").trim() || undefined;
    }

    // Parse variants if template supports them
    if (template.variantElement && item[template.variantElement]) {
      const variantsContainer = item[template.variantElement];
      const variantItems = Array.isArray(variantsContainer?.[template.variantItemElement || "variant"])
        ? variantsContainer[template.variantItemElement || "variant"]
        : (variantsContainer?.[template.variantItemElement || "variant"]
          ? [variantsContainer[template.variantItemElement || "variant"]]
          : (Array.isArray(variantsContainer) ? variantsContainer : [variantsContainer]).filter(Boolean));

      product.variants = variantItems.map((vi: any) => {
        let variantBarcode = vi.barcode || vi.Barcode || vi.BARKOD;
        let variantSku = vi.sku || vi.Sku || vi.SKU;
        let variantPrice = parseNumber(vi.price || vi.Price || vi.satilacakFiyat);
        let variantStock = parseNumber(vi.stock || vi.Stock || vi.stok || vi.quantity) ?? 0;
        let variantImage = vi.image || vi.Image;
        const variantOpts: Array<{ group: string; value: string }> = [];

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
        if (variantOpts.length === 0 && vi["attribute"] || vi["Attribute"] || vi["attributes"] || vi["Attributes"]) {
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
        if (variantOpts.length === 0 && vi["option"] || vi["Option"] || vi["options"] || vi["Options"]) {
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
            if (["barcode","sku","price","stock","image","Barcode","SKU","Price","Stock","quantity"].includes(k)) continue;
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

    return product;
  });
}
