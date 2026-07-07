/**
 * Ersa Güdü 18 feed URL testi (fetch + parse, import yapmaz).
 * Run: npx tsx scripts/test-ersa-gudu-feeds.ts
 */
import {
  ERSA_GUDU_VHT_CODES,
  ERSA_BEZOS_VHT_CODES,
  VHT_FEED_DEFINITIONS,
  loadErsaGuduFeedUrlMap,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { BEZOS_BAYI_XML } from "../src/lib/thyronix/connectors/bezos-bayi-xml";
import { fetchXmlText, maskFeedUrl } from "../src/lib/thyronix/feed-fetch";
import { parseXmlToProducts } from "../src/lib/thyronix/xml-parser";
import { getTemplate } from "../src/lib/thyronix/templates";

async function testBezos() {
  const urlMap = loadErsaGuduFeedUrlMap();
  const urls = [urlMap.VHT38, urlMap.VHT39].filter(Boolean) as string[];
  if (urls.length < 2) {
    return { code: "VHT38+VHT39", ok: false, productCount: 0, error: "Bezos URL eksik" };
  }
  try {
    let total = 0;
    for (const url of urls) {
      const xml = await fetchXmlText(url, 300000);
      const template = getTemplate("bezos");
      if (!template) throw new Error("bezos şablonu yok");
      const products = parseXmlToProducts(xml, template);
      total += products.length;
    }
    return { code: "VHT38+VHT39", ok: total > 0, productCount: total, error: total > 0 ? null : "Ürün bulunamadı" };
  } catch (e) {
    return { code: "VHT38+VHT39", ok: false, productCount: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function testVhtCode(code: string) {
  const urlMap = loadErsaGuduFeedUrlMap();
  const url = urlMap[code];
  const def = VHT_FEED_DEFINITIONS.find((d) => d.code === code);
  if (!def) return { code, ok: false, productCount: 0, error: "Tanım yok" };
  if (!url) return { code, ok: false, productCount: 0, error: "URL yok" };

  try {
    const xml = await fetchXmlText(url, 180000);
    const template = getTemplate(def.inputFormat);
    if (!template) throw new Error(`Şablon yok: ${def.inputFormat}`);
    const products = parseXmlToProducts(xml, template, def.fieldMapping);
    return {
      code,
      ok: products.length > 0,
      productCount: products.length,
      format: def.inputFormat,
      url: maskFeedUrl(url),
      error: products.length > 0 ? null : "Ürün bulunamadı",
    };
  } catch (e) {
    return {
      code,
      ok: false,
      productCount: 0,
      format: def.inputFormat,
      url: maskFeedUrl(url),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const urlMap = loadErsaGuduFeedUrlMap();
  const missing = ERSA_GUDU_VHT_CODES.filter((c) => !urlMap[c]);
  console.log(`Ersa Güdü feed testi — ${ERSA_GUDU_VHT_CODES.length} feed\n`);
  if (missing.length) {
    console.error(`Eksik URL: ${missing.join(", ")}\n`);
    process.exit(1);
  }

  const results = [];
  const bezosCodes = new Set<string>(ERSA_BEZOS_VHT_CODES);
  for (const code of ERSA_GUDU_VHT_CODES) {
    if (bezosCodes.has(code)) continue;
    process.stdout.write(`${code}... `);
    const r = await testVhtCode(code);
    results.push(r);
    console.log(r.ok ? `✓ ${r.productCount} ürün` : `✗ ${r.error}`);
  }

  process.stdout.write("VHT38+VHT39 (Bezos)... ");
  const bezos = await testBezos();
  results.push(bezos);
  console.log(bezos.ok ? `✓ ${bezos.productCount} ürün` : `✗ ${bezos.error}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Özet: ${results.length - failed.length}/${results.length} OK ===`);
  if (failed.length) {
    for (const f of failed) {
      console.log(`  ✗ ${f.code}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
