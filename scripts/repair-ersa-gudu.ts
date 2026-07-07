/**
 * Ersa Güdü — hatalı/eksik kaynakları tek tek sync eder, çıktı XML üretir.
 * Run: npx tsx scripts/repair-ersa-gudu.ts
 * Sync only: npx tsx scripts/repair-ersa-gudu.ts --sync
 * Publish only: npx tsx scripts/repair-ersa-gudu.ts --publish
 */
import { prisma } from "../src/lib/db";
import {
  ERSA_BEZOS_VHT_CODES,
  ERSA_GUDU_VHT_CODES,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import { syncThyronixSourceById } from "../src/lib/thyronix/source-sync-runner";
import { seedRules, provisionAndPublishOutputs } from "./setup-ersa-gudu-helpers";

const SKIP_CODES = new Set(["VHT21"]);

function parseSupplierCode(fixedValues: string | null | undefined): string | null {
  try {
    return JSON.parse(fixedValues || "{}")._supplierCode || null;
  } catch {
    return null;
  }
}

async function findSourceByCode(dealerId: string, code: string) {
  if (ERSA_BEZOS_VHT_CODES.includes(code as (typeof ERSA_BEZOS_VHT_CODES)[number])) {
    return prisma.thyronixSource.findFirst({
      where: {
        dealerId,
        OR: [
          { fixedValues: { contains: `"_supplierCode":"VHT38"` } },
          { inputFormat: "bezos" },
          { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        ],
      },
    });
  }

  return prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { fixedValues: { contains: `"_supplierCode":"${code}"` } },
        { name: { startsWith: `${code} —` } },
      ],
    },
  });
}

async function repairSources(dealerId: string) {
  const targets = ERSA_GUDU_VHT_CODES.filter((c) => !SKIP_CODES.has(c));
  const seen = new Set<string>();
  const results: Array<{ code: string; status: string; count?: number; error?: string }> = [];

  for (const code of targets) {
    if (code === "VHT39") continue;

    const source = await findSourceByCode(dealerId, code);
    if (!source) {
      results.push({ code, status: "missing", error: "Kaynak bulunamadı" });
      console.log(`✗ ${code} — kaynak yok`);
      continue;
    }
    if (seen.has(source.id)) {
      results.push({ code, status: "skipped", count: source.productCount });
      continue;
    }
    seen.add(source.id);

    const needsSync =
      source.status === "error" ||
      source.productCount === 0 ||
      !source.lastSync;

    if (!needsSync) {
      results.push({ code, status: "ok", count: source.productCount });
      console.log(`· ${code} — zaten OK (${source.productCount.toLocaleString("tr-TR")} ürün)`);
      continue;
    }

    try {
      console.log(`→ ${code} sync başlıyor (${source.name})...`);
      const result = await syncThyronixSourceById(source.id, { snapshot: false });
      results.push({ code, status: "synced", count: result.total });
      console.log(`✓ ${code} — ${result.total.toLocaleString("tr-TR")} ürün`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ code, status: "error", error: msg });
      console.log(`✗ ${code} — ${msg.slice(0, 200)}`);
    }
  }

  return results;
}

async function main() {
  const doSync = process.argv.includes("--sync") || (!process.argv.includes("--publish") && process.argv.length <= 2);
  const publishOnly = process.argv.includes("--publish");

  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    console.error("✗ Hedef bayi bulunamadı");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  console.log(`=== Ersa Güdü Onarım — ${dealer?.name || dealerId} ===\n`);

  if (!publishOnly) {
    console.log("=== Kurallar ===");
    await seedRules(dealerId);
    console.log("✓ Kurallar güncellendi\n");

    if (doSync) {
      console.log("=== Eksik/hatalı kaynak sync ===");
      await repairSources(dealerId);
      const total = await prisma.thyronixProduct.count({ where: { dealerId } });
      console.log(`\nToplam ürün: ${total.toLocaleString("tr-TR")}\n`);
    }
  }

  if (publishOnly || doSync) {
    console.log("=== Çıktı XML ===");
    await provisionAndPublishOutputs(dealerId);
  }

  console.log("\n=== Doğrulama ===");
  const sources = await prisma.thyronixSource.findMany({
    where: { dealerId },
    select: { name: true, productCount: true, status: true, fixedValues: true, lastSync: true },
    orderBy: { name: "asc" },
  });

  for (const code of ERSA_GUDU_VHT_CODES) {
    if (code === "VHT39") continue;
    const source = sources.find((s) => parseSupplierCode(s.fixedValues) === code || (code === "VHT38" && parseSupplierCode(s.fixedValues) === "VHT38"));
    if (!source) {
      console.log(`  ${code.padEnd(6)} — kaynak yok`);
      continue;
    }
    const syncAt = source.lastSync?.toISOString().slice(0, 19) || "—";
    console.log(`  ${code.padEnd(6)} ${String(source.productCount).padStart(7)} ürün  ${source.status.padEnd(8)}  ${syncAt}`);
  }

  const total = await prisma.thyronixProduct.count({ where: { dealerId } });
  console.log(`\nDB toplam ürün: ${total.toLocaleString("tr-TR")}`);
  process.exit(0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
