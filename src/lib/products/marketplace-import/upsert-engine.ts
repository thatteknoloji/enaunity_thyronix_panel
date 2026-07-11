import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { CategoryMapping, GroupedProduct, ImportCommitResult } from "./types";

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "urun";
  let candidate = slug;
  let i = 0;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    i++;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

/** Sync VariantGroup + VariantOption from all rows (normal varyant ekleme mantığı) */
async function syncVariantGroups(productId: string, groups: GroupedProduct) {
  const axisValues = new Map<string, Set<string>>();
  for (const row of groups.rows) {
    for (const opt of row.variantOptions) {
      if (!axisValues.has(opt.group)) axisValues.set(opt.group, new Set());
      axisValues.get(opt.group)!.add(opt.value);
    }
  }

  const sortOrder = ["Boyut/Ebat", "Renk", "Web Color", "Çerçeve Tipi"];
  const groupNames = [...axisValues.keys()].sort((a, b) => {
    const ai = sortOrder.indexOf(a);
    const bi = sortOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (let gi = 0; gi < groupNames.length; gi++) {
    const groupName = groupNames[gi];
    let vg = await prisma.variantGroup.findFirst({ where: { productId, name: groupName } });
    if (!vg) {
      vg = await prisma.variantGroup.create({ data: { productId, name: groupName, sortOrder: gi } });
    }

    for (const value of axisValues.get(groupName) || []) {
      const existing = await prisma.variantOption.findFirst({ where: { groupId: vg.id, value } });
      if (!existing) {
        await prisma.variantOption.create({ data: { groupId: vg.id, value } });
      }
    }
  }
}

function optionsKey(opts: { group: string; value: string }[]): string {
  return JSON.stringify(
    [...opts].sort((a, b) => a.group.localeCompare(b.group) || a.value.localeCompare(b.value)),
  );
}

function parseDelimitedList(value: string) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAeoFaq(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(/\r?\n/)
      .map((line) => {
        const [question, ...answerParts] = line.split("|");
        return { question: question?.trim() || "", answer: answerParts.join("|").trim() };
      })
      .filter((item) => item.question || item.answer);
  }
}

async function upsertVariant(
  productId: string,
  row: GroupedProduct["rows"][0],
  errors: string[],
): Promise<"created" | "updated" | "skipped"> {
  const optsStr = JSON.stringify(row.variantOptions);

  // Global barcode conflict check
  if (row.barcode) {
    const byBarcode = await prisma.variant.findFirst({ where: { barcode: row.barcode } });
    if (byBarcode && byBarcode.productId !== productId) {
      if (byBarcode.sku !== row.sku) {
        errors.push(`Barkod ${row.barcode}: farklı SKU ile çakışma (${byBarcode.sku} ≠ ${row.sku})`);
        return "skipped";
      }
    }
  }

  // Find by options first so imports may intentionally keep the same SKU across variants.
  let variant = null;
  if (row.variantOptions.length) {
    const all = await prisma.variant.findMany({ where: { productId } });
    variant = all.find((v) => optionsKey(JSON.parse(v.options || "[]")) === optionsKey(row.variantOptions)) || null;
  }
  if (!variant && row.sku) {
    variant = await prisma.variant.findFirst({ where: { productId, sku: row.sku } });
  }
  if (!variant && row.barcode) {
    variant = await prisma.variant.findFirst({ where: { productId, barcode: row.barcode } });
  }

  const data = {
    sku: row.sku,
    barcode: row.barcode,
    price: row.price,
    stock: row.stock,
    options: optsStr,
    image: row.image || "",
    active: true,
  };

  if (variant) {
    await prisma.variant.update({ where: { id: variant.id }, data });
    return "updated";
  }

  await prisma.variant.create({ data: { productId, ...data } });
  return "created";
}

export async function processImportGroups(
  groups: GroupedProduct[],
  categoryMapping: CategoryMapping,
): Promise<ImportCommitResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const productIds: string[] = [];

  for (const group of groups) {
    if (group.errors.length) {
      skipped += group.rows.length;
      errors.push(`${group.modelCode}: ${group.errors[0]}`);
      continue;
    }

    const mappedCategory = categoryMapping[group.category] || group.category || "general";
    let product = await prisma.product.findFirst({ where: { modelCode: group.modelCode } });
    const imagesJson = JSON.stringify(group.images);
    const productData = {
      name: group.name,
      description: group.description || group.name,
      brand: group.brand,
      category: mappedCategory,
      modelCode: group.modelCode,
      price: group.price,
      stock: group.stock,
      image: group.image || "/placeholder.svg",
      images: imagesJson,
      sku: group.modelCode,
      seoTitle: group.seoTitle || group.name,
      seoDescription: group.seoDescription || group.description || group.name,
      seoKeywords: parseDelimitedList(group.seoKeywords).join(", "),
      geoTargetsJson: JSON.stringify(parseDelimitedList(group.geoTargets)),
      aeoAnswerSummary: group.aeoAnswerSummary || group.description || group.name,
      aeoFaqJson: JSON.stringify(parseAeoFaq(group.aeoFaq)),
    };

    if (product) {
      product = await prisma.product.update({ where: { id: product.id }, data: productData });
      updated++;
    } else {
      const slug = await uniqueSlug(`${group.name}-${group.modelCode}`);
      product = await prisma.product.create({ data: { ...productData, slug } });
      created++;
    }

    productIds.push(product.id);
    await syncVariantGroups(product.id, group);

    for (const row of group.rows) {
      const result = await upsertVariant(product.id, row, errors);
      if (result === "skipped") skipped++;
    }

    const variantStock = await prisma.variant.aggregate({
      where: { productId: product.id },
      _sum: { stock: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: variantStock._sum.stock || 0 },
    });
  }

  return { jobId: "", created, updated, skipped, errors, productIds };
}

export async function commitImport(
  groups: GroupedProduct[],
  categoryMapping: CategoryMapping,
  jobMeta: {
    fileName: string;
    preset: string;
    createdBy?: string;
    jobId?: string;
    skipJobFinalize?: boolean;
  },
): Promise<ImportCommitResult> {
  const start = Date.now();

  if (jobMeta.skipJobFinalize) {
    return processImportGroups(groups, categoryMapping);
  }

  const job = jobMeta.jobId
    ? await prisma.productImportJob.update({
        where: { id: jobMeta.jobId },
        data: { status: "RUNNING", startedAt: new Date(), mappingJson: JSON.stringify(categoryMapping) },
      })
    : await prisma.productImportJob.create({
        data: {
          type: jobMeta.preset,
          status: "RUNNING",
          fileName: jobMeta.fileName,
          createdBy: jobMeta.createdBy || "",
          startedAt: new Date(),
          mappingJson: JSON.stringify(categoryMapping),
          productCount: groups.length,
        },
      });

  try {
    const result = await processImportGroups(groups, categoryMapping);

    await prisma.productImportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        productCount: groups.length,
        addedCount: result.created,
        updatedCount: result.updated,
        removedCount: 0,
        unchangedCount: result.skipped,
        reportJson: JSON.stringify({ productIds: result.productIds, errors: result.errors.slice(0, 100) }),
        durationMs: Date.now() - start,
        completedAt: new Date(),
      },
    });

    return { ...result, jobId: job.id };
  } catch (e) {
    await prisma.productImportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: e instanceof Error ? e.message : "Bilinmeyen hata",
        completedAt: new Date(),
        durationMs: Date.now() - start,
      },
    });
    throw e;
  }
}
