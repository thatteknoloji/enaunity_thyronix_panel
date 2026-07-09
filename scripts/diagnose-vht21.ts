/**
 * VHT21 (FTA Ticaret) detaylı teşhis raporu.
 * Run: npx tsx scripts/diagnose-vht21.ts
 */
import dns from "dns/promises";
import { loadErsaGuduFeedUrlMap } from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { fetchXmlText, maskFeedUrl } from "../src/lib/thyronix/feed-fetch";
import { parseXmlToProducts } from "../src/lib/thyronix/xml-parser";
import { getTemplate } from "../src/lib/thyronix/templates";

const CODE = "VHT21";
const ALT_DOMAINS = [
  "ftaticaret.com",
  "www.ftaticaret.com",
  "ftaticaret.com",
  "www.ftaticaret.com",
];

async function resolveHost(hostname: string) {
  try {
    const v4 = await dns.resolve4(hostname);
    return { ok: true as const, addresses: v4 };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
      code: (e as NodeJS.ErrnoException).code,
    };
  }
}

async function probeUrl(url: string) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": "ThyronixFeedBot/1.0", Accept: "application/xml,text/xml,*/*" },
    });
    const text = await res.text();
    const ms = Date.now() - started;
    const looksXml = text.includes("<") && (text.includes("<?xml") || text.includes("<urun") || text.includes("<Urun") || text.includes("<product"));
    return {
      ok: res.ok,
      status: res.status,
      ms,
      bytes: text.length,
      looksXml,
      snippet: text.slice(0, 200).replace(/\s+/g, " "),
      finalUrl: res.url,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: (e as NodeJS.ErrnoException).code,
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const map = loadErsaGuduFeedUrlMap();
  const configuredUrl = map[CODE];
  const report: string[] = [];

  report.push(`# VHT21 (FTA Ticaret) Teşhis Raporu`);
  report.push(`Tarih: ${new Date().toISOString()}`);
  report.push("");

  if (!configuredUrl) {
    report.push("## Sonuç: URL yapılandırması yok");
    console.log(report.join("\n"));
    process.exit(1);
  }

  report.push(`## Yapılandırılmış URL`);
  report.push(`- Maskeli: ${maskFeedUrl(configuredUrl)}`);
  try {
    const u = new URL(configuredUrl);
    report.push(`- Host: ${u.hostname}`);
    report.push(`- Path uzunluğu: ${u.pathname.length} karakter`);
  } catch {
    report.push("- URL parse edilemedi");
  }
  report.push("");

  report.push(`## DNS çözümlemesi`);
  const configuredHost = new URL(configuredUrl).hostname;
  for (const host of [...new Set([configuredHost, ...ALT_DOMAINS])]) {
    const r = await resolveHost(host);
    if (r.ok) {
      report.push(`- ✓ ${host} → ${r.addresses.join(", ")}`);
    } else {
      report.push(`- ✗ ${host} → ${r.code || "ERROR"}: ${r.error}`);
    }
  }
  report.push("");

  report.push(`## HTTP probe (yapılandırılmış URL)`);
  const primary = await probeUrl(configuredUrl);
  if ("status" in primary) {
    report.push(`- HTTP ${primary.status} · ${primary.ms}ms · ${primary.bytes} byte`);
    report.push(`- XML benzeri içerik: ${primary.looksXml ? "evet" : "hayır"}`);
    if (primary.finalUrl && primary.finalUrl !== configuredUrl) {
      report.push(`- Yönlendirme: ${maskFeedUrl(primary.finalUrl)}`);
    }
    if (!primary.ok) {
      report.push(`- Snippet: ${primary.snippet}`);
    }
  } else {
    report.push(`- ✗ ${primary.code || "FETCH_ERROR"}: ${primary.error}`);
  }
  report.push("");

  if (primary.ok && "looksXml" in primary && primary.looksXml) {
    report.push(`## Thyronix parse (leyna şablonu)`);
    try {
      const xml = await fetchXmlText(configuredUrl, 120000);
      const template = getTemplate("leyna");
      if (!template) throw new Error("leyna şablonu yok");
      const products = parseXmlToProducts(xml, template);
      report.push(`- ✓ ${products.length} ürün parse edildi`);
      if (products[0]) {
        const s = products[0];
        report.push(`- Örnek: ${s.name?.slice(0, 60) || "—"} | fiyat: ${s.price ?? "—"}`);
      }
    } catch (e) {
      report.push(`- ✗ Parse hatası: ${e instanceof Error ? e.message : String(e)}`);
    }
    report.push("");
  }

  report.push(`## fetchXmlText (Thyronix motoru)`);
  try {
    const xml = await fetchXmlText(configuredUrl, 120000);
    report.push(`- ✓ İndirildi: ${xml.length.toLocaleString("tr-TR")} karakter`);
  } catch (e) {
    report.push(`- ✗ ${e instanceof Error ? e.message : String(e)}`);
  }
  report.push("");

  const dnsFailed = !(await resolveHost(configuredHost)).ok;
  const fetchFailed = !("status" in primary) || !primary.ok;

  report.push(`## Özet ve olası nedenler`);
  if (!dnsFailed && !fetchFailed && "looksXml" in primary && primary.looksXml) {
    report.push(`- **Durum: ÇALIŞIYOR** — Feed erişilebilir ve XML içerik dönüyor.`);
  } else if (dnsFailed) {
    report.push(`- **Durum: DNS HATASI (ENOTFOUND / NXDOMAIN)**`);
    report.push(`- Domain adı bu ortamda çözülemiyor. Olası nedenler:`);
    report.push(`  1. Yanlış domain yazımı (ftaticaret vs ftaticaret)`);
    report.push(`  2. Domain süresi dolmuş veya DNS kaydı kaldırılmış`);
    report.push(`  3. Yerel DNS / ağ kısıtı (production sunucudan tekrar denenmeli)`);
    report.push(`- **Öneri:** FTA Ticaret'ten güncel XML export linkini isteyin veya bayilik panelinden yeni token alın.`);
  } else if (fetchFailed && "status" in primary) {
    report.push(`- **Durum: HTTP ${primary.status}** — Sunucu erişilebilir ama feed reddediyor.`);
    report.push(`- Export token süresi dolmuş veya IP kısıtlaması olabilir.`);
  } else if (fetchFailed) {
    report.push(`- **Durum: AĞ HATASI** — Bağlantı kurulamadı (timeout, TLS, firewall).`);
  } else {
    report.push(`- **Durum: İÇERİK XML DEĞİL** — URL HTML/hata sayfası dönüyor olabilir.`);
  }

  const out = report.join("\n");
  console.log(out);

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "storage/thyronix/vht21-diagnosis.txt");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out, "utf8");
  console.log(`\nRapor kaydedildi: ${outPath}`);

  process.exit(dnsFailed || fetchFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
