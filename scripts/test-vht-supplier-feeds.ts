/**
 * VHT tedarikçi feedlerini test eder (fetch + parse, import yapmaz).
 * Run: npx tsx scripts/test-vht-supplier-feeds.ts
 * Run one: npx tsx scripts/test-vht-supplier-feeds.ts VHT1 VHT36
 */
import {
  VHT_FEED_DEFINITIONS,
  loadVhtFeedUrlMap,
  type VhtFeedDefinition,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { fetchXmlText, maskFeedUrl, discoverIndexedFeedUrls } from "../src/lib/thyronix/feed-fetch";
import { parseXmlToProducts } from "../src/lib/thyronix/xml-parser";
import { getTemplate } from "../src/lib/thyronix/templates";

const FALLBACK_FORMATS = ["leyna", "markentegra", "lisinya", "ticimax", "ebijuteri", "woo_feed", "projesoft", "woocommerce", "custom_xml"];

type Sample = {
  name?: string;
  barcode?: string;
  stockCode?: string;
  price?: number;
  stock?: number;
  brand?: string;
  category?: string;
  image?: string;
};

function scoreProduct(p: Sample): number {
  let s = 0;
  if (p.name) s += 2;
  if (p.barcode || p.stockCode) s += 2;
  if (p.price && p.price > 0) s += 2;
  if (p.stock !== undefined) s += 1;
  if (p.brand) s += 1;
  if (p.category) s += 1;
  if (p.image) s += 1;
  return s;
}

async function testFeed(def: VhtFeedDefinition, url: string) {
  const result = {
    code: def.code,
    name: def.name,
    inputFormat: def.inputFormat,
    url: maskFeedUrl(url),
    ok: false,
    productCount: 0,
    detectedFormat: def.inputFormat,
    error: null as string | null,
    samples: [] as Sample[],
    fieldCoverage: { name: 0, barcode: 0, price: 0, stock: 0, brand: 0, category: 0, image: 0 },
  };

  try {
    const xml = await fetchXmlText(url, 180000);
    if (!xml.includes("<") || xml.length < 50) {
      throw new Error("Geçersiz XML içerik");
    }

    const indexedUrls = discoverIndexedFeedUrls(xml);
    const xmlChunks: string[] = [];
    if (indexedUrls.length > 0) {
      for (const subUrl of indexedUrls) {
        xmlChunks.push(await fetchXmlText(subUrl, 180000));
      }
    } else {
      xmlChunks.push(xml);
    }

    let template = getTemplate(def.inputFormat);
    if (!template) throw new Error(`Şablon bulunamadı: ${def.inputFormat}`);

    let products = parseXmlToProducts(xmlChunks[0], template, def.fieldMapping);
    let bestFormat = def.inputFormat;

    if (xmlChunks.length > 1) {
      for (let i = 1; i < xmlChunks.length; i++) {
        products = products.concat(parseXmlToProducts(xmlChunks[i], template, def.fieldMapping));
      }
    }

    if (products.length === 0) {
      let bestCount = 0;
      for (const fmt of FALLBACK_FORMATS) {
        if (fmt === def.inputFormat) continue;
        const t = getTemplate(fmt);
        if (!t) continue;
        const batch = parseXmlToProducts(xmlChunks[0], t, def.fieldMapping);
        if (batch.length > bestCount) {
          bestCount = batch.length;
          products = batch;
          template = t;
          bestFormat = fmt;
        }
      }
    }

    result.productCount = products.length;
    result.detectedFormat = bestFormat;
    result.ok = products.length > 0;

    const sampleProducts = products.slice(0, 5);
    result.samples = sampleProducts.map((p) => ({
      name: p.name?.slice(0, 60),
      barcode: p.barcode,
      stockCode: p.stockCode,
      price: p.price,
      stock: p.stock,
      brand: p.brand,
      category: p.category?.slice(0, 40),
      image: p.image ? "yes" : undefined,
    }));

    for (const p of products.slice(0, Math.min(products.length, 200))) {
      if (p.name) result.fieldCoverage.name++;
      if (p.barcode || p.stockCode) result.fieldCoverage.barcode++;
      if (p.price && p.price > 0) result.fieldCoverage.price++;
      if (p.stock !== undefined) result.fieldCoverage.stock++;
      if (p.brand) result.fieldCoverage.brand++;
      if (p.category) result.fieldCoverage.category++;
      if (p.image || p.images) result.fieldCoverage.image++;
    }

    if (products.length > 0 && scoreProduct(products[0]) < 3) {
      result.error = "Ürünler parse edildi ancak kritik alanlar eksik — mapping gözden geçirin";
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }

  return result;
}

async function main() {
  const filter = process.argv.slice(2).map((s) => s.toUpperCase());
  const urlMap = loadVhtFeedUrlMap();
  const defs = VHT_FEED_DEFINITIONS.filter((d) => (filter.length ? filter.includes(d.code) : true));

  console.log("=== VHT Feed Test ===\n");
  const missing = defs.filter((d) => !urlMap[d.code]);
  if (missing.length) {
    console.warn("URL eksik:", missing.map((d) => d.code).join(", "));
    console.warn("scripts/data/vht-supplier-feeds.json veya VHT_FEED_<CODE>_URL env kullanın.\n");
  }

  const results = [];
  for (const def of defs) {
    const url = urlMap[def.code];
    if (!url) {
      results.push({
        code: def.code,
        name: def.name,
        ok: false,
        error: "URL tanımlı değil",
        productCount: 0,
      });
      continue;
    }
    process.stdout.write(`→ ${def.code} ${def.name}... `);
    const r = await testFeed(def, url);
    results.push(r);
    console.log(r.ok ? `✓ ${r.productCount} ürün (${r.detectedFormat})` : `✗ ${r.error}`);
  }

  console.log("\n=== ÖZET ===");
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(`Başarılı: ${ok.length}/${results.length}`);
  console.log(`Hatalı: ${fail.length}/${results.length}`);
  if (ok.length) {
    console.log("\nBaşarılı feedler:");
    for (const r of ok) {
      const row = r as Awaited<ReturnType<typeof testFeed>>;
      console.log(`  ${row.code}: ${row.productCount} ürün [${row.detectedFormat}]`);
    }
  }
  if (fail.length) {
    console.log("\nHatalı feedler:");
    for (const r of fail) {
      console.log(`  ${r.code}: ${r.error || "bilinmeyen"}`);
    }
  }

  console.log("\n=== JSON ===");
  console.log(JSON.stringify(results, null, 2));

  process.exit(fail.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
