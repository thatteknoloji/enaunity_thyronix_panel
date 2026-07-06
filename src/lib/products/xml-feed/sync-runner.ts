import { prisma } from "@/lib/db";
import { groupByModelCode } from "../marketplace-import/grouper";
import { applyCategoryMappingToRows, ensureStoreCategories } from "./category-mapper";
import { fetchXmlFeed } from "./fetcher";
import { mergeUpsertFeedGroups } from "./merge-upsert";
import { parseFeedXmlToRows } from "./parser";
import { parseFeedRules, transformImportRows } from "./transform";
import type { XmlFeedSyncReport } from "./types";

function parseJsonObject(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function parseCategoryMapping(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function runXmlFeedSync(feedId: string): Promise<XmlFeedSyncReport> {
  const started = Date.now();
  const feed = await prisma.productXmlFeed.findUnique({ where: { id: feedId } });
  if (!feed) throw new Error("Feed bulunamadı");

  const rules = parseFeedRules(JSON.parse(feed.rulesJson || "{}"));
  const mappingJson = parseJsonObject(feed.mappingJson);
  const categoryMapping = parseCategoryMapping(feed.categoryMappingJson);

  try {
    const xml = await fetchXmlFeed(feed.feedUrl);
    const { rows } = parseFeedXmlToRows(xml, feed.templateId, mappingJson);
    const transformed = transformImportRows(rows, rules);
    const { rows: categorized, unmapped } = applyCategoryMappingToRows(
      transformed.map((r) => ({ ...r, subcategory: feed.rootCategory })),
      categoryMapping,
      feed.rootCategory,
    );

    const errors: string[] = [];
    if (unmapped.length) {
      errors.push(`Eşlenmemiş kategoriler: ${unmapped.join(", ")}`);
    }

    const validRows = categorized.filter((r) => r.category?.trim());
    const skippedUnmapped = categorized.length - validRows.length;

    if (rules.autoCreateCategories) {
      await ensureStoreCategories(validRows.map((r) => r.category));
    }

    const { groups } = groupByModelCode(validRows);
    const externalIdByModel: Record<string, string> = {};
    for (const row of validRows) {
      const ext = String(row.raw?.externalId || "");
      if (ext) externalIdByModel[row.modelCode] = ext;
    }

    const result = await mergeUpsertFeedGroups(feed.id, groups, feed.rootCategory, rules, externalIdByModel);
    const allErrors = [...errors, ...result.errors];
    const status = allErrors.length ? (result.added + result.updated > 0 ? "PARTIAL" : "FAILED") : "SUCCESS";

    const report: XmlFeedSyncReport = {
      status,
      added: result.added,
      updated: result.updated,
      skipped: result.skipped + skippedUnmapped,
      errors: allErrors.slice(0, 200),
      durationMs: Date.now() - started,
    };

    const nextSync = new Date(Date.now() + feed.syncIntervalHours * 60 * 60 * 1000);
    await prisma.productXmlFeed.update({
      where: { id: feed.id },
      data: {
        lastSyncAt: new Date(),
        nextSyncAt: nextSync,
        lastSyncStatus: status,
        lastSyncReportJson: JSON.stringify(report),
        productCount: await prisma.productFeedLink.count({ where: { feedId: feed.id } }),
        status: status === "FAILED" ? "ERROR" : "ACTIVE",
      },
    });

    await prisma.productXmlFeedSyncLog.create({
      data: {
        feedId: feed.id,
        status,
        added: report.added,
        updated: report.updated,
        skipped: report.skipped,
        errorsJson: JSON.stringify(report.errors),
        durationMs: report.durationMs,
      },
    });

    return report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync hatası";
    const report: XmlFeedSyncReport = {
      status: "FAILED",
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [msg],
      durationMs: Date.now() - started,
    };
    await prisma.productXmlFeed.update({
      where: { id: feed.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "FAILED",
        lastSyncReportJson: JSON.stringify(report),
        status: "ERROR",
      },
    });
    await prisma.productXmlFeedSyncLog.create({
      data: {
        feedId: feed.id,
        status: "FAILED",
        errorsJson: JSON.stringify([msg]),
        durationMs: report.durationMs,
      },
    });
    return report;
  }
}

export async function previewXmlFeedSync(feed: {
  feedUrl: string;
  templateId: string;
  mappingJson: string;
  categoryMappingJson: string;
  rootCategory: string;
  rulesJson: string;
}) {
  const rules = parseFeedRules(JSON.parse(feed.rulesJson || "{}"));
  const mappingJson = parseJsonObject(feed.mappingJson);
  const categoryMapping = parseCategoryMapping(feed.categoryMappingJson);
  const xml = await fetchXmlFeed(feed.feedUrl);
  const { rows, categoryValues, brandValues } = parseFeedXmlToRows(xml, feed.templateId, mappingJson);
  const { transformImportRows } = await import("./transform");
  const transformed = transformImportRows(rows, rules);
  const { rows: categorized, unmapped } = applyCategoryMappingToRows(
    transformed.map((r) => ({ ...r, subcategory: feed.rootCategory })),
    categoryMapping,
    feed.rootCategory,
  );
  const validRows = categorized.filter((r) => r.category?.trim());
  const { groups, ungroupedRows } = groupByModelCode(validRows);
  return {
    groups: groups.slice(0, 50),
    categoryValues,
    brandValues,
    unmappedCategories: unmapped,
    totalRows: rows.length,
    groupCount: groups.length,
    ungroupedCount: ungroupedRows.length,
    errors: unmapped.map((c) => `Eşlenmemiş kategori: ${c}`),
  };
}
