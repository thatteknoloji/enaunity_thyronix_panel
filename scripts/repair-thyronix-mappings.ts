import { prisma } from "../src/lib/db";
import { buildSuggestedProductMapping, buildSuggestedVariantMapping } from "../src/lib/thyronix/field-aliases";
import { fetchXmlText, parseFixedValues, resolveSourceFeedUrls } from "../src/lib/thyronix/feed-fetch";
import { loadMergedFeedProducts } from "../src/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds } from "../src/lib/thyronix/source-feed-provision";
import { syncThyronixSourceById } from "../src/lib/thyronix/source-sync-runner";
import { getTemplate } from "../src/lib/thyronix/templates";
import { inspectXmlFeed } from "../src/lib/thyronix/xml-parser";

type Args = {
  apply: boolean;
  sync: boolean;
  repairFeedCounts: boolean;
  repairSourceCounts: boolean;
  source?: string;
  limit: number;
};

type RepairResult = {
  id: string;
  name: string;
  type: string;
  status: "checked" | "updated" | "synced" | "skipped" | "error";
  detectedFields?: number;
  variantFields?: number;
  addedProductMappings?: string[];
  addedVariantMappings?: string[];
  syncedProducts?: number;
  error?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getValue = (name: string) => {
    const prefix = `${name}=`;
    return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  };

  return {
    apply: args.includes("--apply"),
    sync: args.includes("--sync"),
    repairFeedCounts: args.includes("--repair-feed-counts"),
    repairSourceCounts: args.includes("--repair-source-counts"),
    source: getValue("--source"),
    limit: Math.max(1, Math.min(Number(getValue("--limit") || 25), 100)),
  };
}

function parseJsonRecord(raw?: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value == null ? "" : String(value)]))
      : {};
  } catch {
    return {};
  }
}

function diffAdded(before: Record<string, string>, after: Record<string, string>) {
  return Object.keys(after).filter((key) => before[key] !== after[key]);
}

function mergeWithoutOverwriting<T extends Record<string, string>>(suggested: T, current: T): T {
  return { ...suggested, ...current };
}

async function repairSource(source: Awaited<ReturnType<typeof prisma.thyronixSource.findMany>>[number], args: Args): Promise<RepairResult> {
  if (source.type !== "xml") {
    return { id: source.id, name: source.name, type: source.type, status: "skipped" };
  }

  const template = getTemplate(source.inputFormat || "custom_xml");
  if (!template) {
    return { id: source.id, name: source.name, type: source.type, status: "error", error: `Template bulunamadı: ${source.inputFormat}` };
  }

  const feedUrl = resolveSourceFeedUrls(source.xmlUrl, source.fixedValues)[0];
  if (!feedUrl) {
    return { id: source.id, name: source.name, type: source.type, status: "error", error: "Kaynak URL yok" };
  }

  try {
    const xmlText = await fetchXmlText(feedUrl, 60000);
    const inspected = inspectXmlFeed(xmlText, template);
    const currentProductMapping = parseJsonRecord(source.fieldMapping);
    const currentVariantMapping = parseJsonRecord(source.variantMapping);
    const suggestedProductMapping = buildSuggestedProductMapping(inspected.detectedFields);
    const suggestedVariantMapping = buildSuggestedVariantMapping(inspected.variantFields);
    const nextProductMapping = mergeWithoutOverwriting(suggestedProductMapping, currentProductMapping);
    const nextVariantMapping = mergeWithoutOverwriting(suggestedVariantMapping, currentVariantMapping);
    const fixedValues = parseFixedValues(source.fixedValues);
    const nextFixedValues = {
      ...fixedValues,
      _lastDetectedFieldCount: String(inspected.detectedFields.length),
      _lastVariantFieldCount: String(inspected.variantFields.length),
      _variantFields: inspected.variantFields.join("|"),
      _lastMappingRepairAt: new Date().toISOString(),
    };
    const addedProductMappings = diffAdded(currentProductMapping, nextProductMapping);
    const addedVariantMappings = diffAdded(currentVariantMapping, nextVariantMapping);
    const changed = addedProductMappings.length > 0 || addedVariantMappings.length > 0 ||
      fixedValues._variantFields !== nextFixedValues._variantFields;

    if (args.apply && changed) {
      await prisma.thyronixSource.update({
        where: { id: source.id },
        data: {
          fieldMapping: JSON.stringify(nextProductMapping),
          variantMapping: JSON.stringify(nextVariantMapping),
          fixedValues: JSON.stringify(nextFixedValues),
        },
      });
    }

    let syncedProducts: number | undefined;
    let status: RepairResult["status"] = changed && args.apply ? "updated" : "checked";
    if (args.apply && args.sync) {
      const synced = await syncThyronixSourceById(source.id, {
        snapshot: false,
        refreshFeedTotals: true,
        fetchTimeoutMs: 180000,
      });
      syncedProducts = synced.total;
      status = "synced";
    }

    return {
      id: source.id,
      name: source.name,
      type: source.type,
      status,
      detectedFields: inspected.detectedFields.length,
      variantFields: inspected.variantFields.length,
      addedProductMappings,
      addedVariantMappings,
      syncedProducts,
    };
  } catch (error) {
    return {
      id: source.id,
      name: source.name,
      type: source.type,
      status: "error",
      error: error instanceof Error ? error.message : "Kaynak onarım hatası",
    };
  }
}

async function repairFeedCounts(apply: boolean) {
  const feeds = await prisma.thyronixFeed.findMany({
    select: { id: true, name: true, mergeStrategy: true, outputFormat: true, dealerId: true, sourceId: true, productCount: true },
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  for (const feed of feeds) {
    const sourceIds = await resolveFeedSourceIds(feed as any);
    const merged = await loadMergedFeedProducts(feed as any, sourceIds);
    const changed = merged.length !== feed.productCount;
    if (apply && changed) {
      await prisma.thyronixFeed.update({
        where: { id: feed.id },
        data: { productCount: merged.length },
      });
    }
    results.push({
      id: feed.id,
      name: feed.name,
      oldProductCount: feed.productCount,
      liveProductCount: merged.length,
      changed,
    });
  }
  return results;
}

async function repairSourceCounts(apply: boolean) {
  const sources = await prisma.thyronixSource.findMany({
    select: { id: true, name: true, productCount: true },
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  for (const source of sources) {
    const liveProductCount = await prisma.thyronixProduct.count({ where: { sourceId: source.id } });
    const changed = liveProductCount !== source.productCount;
    if (apply && changed) {
      await prisma.thyronixSource.update({
        where: { id: source.id },
        data: { productCount: liveProductCount },
      });
    }
    results.push({
      id: source.id,
      name: source.name,
      oldProductCount: source.productCount,
      liveProductCount,
      changed,
    });
  }
  return results;
}

async function main() {
  const args = parseArgs();
  const sourceWhere = args.source
    ? {
        OR: [
          { id: args.source },
          { name: { contains: args.source } },
        ],
      }
    : {};

  const sources = await prisma.thyronixSource.findMany({
    where: sourceWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: args.limit,
  });

  const sourceResults: RepairResult[] = [];
  for (const source of sources) {
    sourceResults.push(await repairSource(source, args));
  }

  const feedResults = args.repairFeedCounts ? await repairFeedCounts(args.apply) : [];
  const sourceCountResults = args.repairSourceCounts ? await repairSourceCounts(args.apply) : [];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    sync: args.sync,
    checkedSources: sources.length,
    sourceResults,
    sourceCountResults,
    feedResults,
    note: args.apply
      ? "Veritabanına güvenli merge uygulandı; mevcut kullanıcı eşleştirmeleri korunur."
      : "Dry-run: hiçbir kayıt değiştirilmedi. Uygulamak için --apply ekleyin.",
  };

  console.log(JSON.stringify(report, null, 2));

  if (args.apply && sourceResults.some((item) => item.status === "error")) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
