import { prisma } from "@/lib/db";
import { detectSourceType, extractDomain } from "@/lib/linkslash/source-type";
import { normalizeLinkUrl, slugifyTag } from "@/lib/linkslash/normalize-url";
import type { SyncContext } from "@/lib/linkslash/sync/context";

type LinkInput = {
  cloudId?: string;
  localId?: string;
  url: string;
  title?: string;
  description?: string;
  rawText?: string;
  aiSummary?: string;
  aiAnalysisJson?: string;
  aiAnalyzedAt?: string;
  sourceType?: string;
  platform?: string;
  domain?: string;
  imageUrl?: string;
  faviconUrl?: string;
  notes?: string;
  categorySlug?: string;
  status?: string;
  importance?: number;
  language?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
  updatedAt?: string;
};

type ChangeOp = {
  op: "create" | "update" | "delete";
  entityType: "link" | "category" | "tag";
  localId?: string;
  cloudId?: string;
  updatedAt?: string;
  data?: Record<string, unknown>;
};

async function logSync(
  ctx: SyncContext,
  direction: string,
  entityType: string,
  entityId: string,
  status: string,
  payload: unknown,
  error = ""
) {
  await prisma.linkSlashSyncLog.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      direction,
      entityType,
      entityId,
      status,
      payloadJson: JSON.stringify(payload).slice(0, 4000),
      error: error.slice(0, 500),
    },
  });
}

function serializeLink(
  link: Awaited<ReturnType<typeof fetchLinksForUser>>[number]
) {
  return {
    id: link.id,
    localId: link.localId,
    url: link.url,
    normalizedUrl: link.normalizedUrl,
    title: link.title,
    description: link.description,
    rawText: link.rawText,
    aiSummary: link.aiSummary,
    aiAnalysisJson: link.aiAnalysisJson || "{}",
    aiAnalyzedAt: link.aiAnalyzedAt,
    sourceType: link.sourceType,
    platform: link.platform,
    domain: link.domain,
    imageUrl: link.imageUrl,
    faviconUrl: link.faviconUrl,
    notes: link.notes,
    categorySlug: link.categorySlug,
    status: link.status,
    importance: link.importance,
    language: link.language,
    isFavorite: link.isFavorite,
    isArchived: link.isArchived,
    deletedAt: link.deletedAt,
    tags: link.linkTags.map((lt) => lt.tag.name),
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    lastSyncedAt: link.lastSyncedAt,
  };
}

async function fetchLinksForUser(ctx: SyncContext, since?: Date) {
  return prisma.linkSlashLink.findMany({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      ...(since ? { updatedAt: { gt: since } } : {}),
    },
    include: {
      linkTags: { include: { tag: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: since ? 500 : 5000,
  });
}

export async function bootstrapSync(ctx: SyncContext) {
  const [links, categories, tags] = await Promise.all([
    fetchLinksForUser(ctx),
    prisma.linkSlashCategory.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.linkSlashTag.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      orderBy: { name: "asc" },
    }),
  ]);

  const linkTags = links.flatMap((link) =>
    link.linkTags.map((lt) => ({
      id: lt.id,
      linkId: link.id,
      tagId: lt.tagId,
      tagName: lt.tag.name,
      createdAt: lt.createdAt,
    }))
  );

  return {
    serverTime: new Date().toISOString(),
    links: links.filter((l) => !l.deletedAt).map(serializeLink),
    deletedLinks: links.filter((l) => l.deletedAt).map((l) => ({ id: l.id, localId: l.localId, deletedAt: l.deletedAt })),
    categories,
    tags,
    linkTags,
  };
}

export async function pullSync(ctx: SyncContext, since?: Date) {
  const links = await fetchLinksForUser(ctx, since);
  const categories = since
    ? await prisma.linkSlashCategory.findMany({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, updatedAt: { gt: since } },
      })
    : [];
  const tags = since
    ? await prisma.linkSlashTag.findMany({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, updatedAt: { gt: since } },
      })
    : [];

  return {
    serverTime: new Date().toISOString(),
    since: since?.toISOString() || null,
    links: links.filter((l) => !l.deletedAt).map(serializeLink),
    deletedLinks: links.filter((l) => l.deletedAt).map((l) => ({ id: l.id, localId: l.localId, deletedAt: l.deletedAt })),
    categories,
    tags,
  };
}

async function upsertTagsForLink(ctx: SyncContext, linkId: string, tagNames: string[]) {
  await prisma.linkSlashLinkTag.deleteMany({ where: { linkId } });
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = slugifyTag(trimmed);
    const tag = await prisma.linkSlashTag.upsert({
      where: {
        tenantId_userId_slug: { tenantId: ctx.tenantId, userId: ctx.userId, slug },
      },
      create: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        name: trimmed,
        slug,
      },
      update: { name: trimmed, updatedAt: new Date() },
    });
    await prisma.linkSlashLinkTag.upsert({
      where: { linkId_tagId: { linkId, tagId: tag.id } },
      create: { linkId, tagId: tag.id },
      update: {},
    });
  }
}

export async function upsertCloudLink(ctx: SyncContext, input: LinkInput) {
  const normalizedUrl = normalizeLinkUrl(input.url);
  if (!normalizedUrl) throw new Error("Geçersiz URL");

  const domain = input.domain || extractDomain(input.url);
  const sourceType = input.sourceType || detectSourceType(input.url);
  const platform = input.platform || "website";

  const existing = input.cloudId
    ? await prisma.linkSlashLink.findFirst({
        where: { id: input.cloudId, tenantId: ctx.tenantId, userId: ctx.userId },
      })
    : await prisma.linkSlashLink.findFirst({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, normalizedUrl, deletedAt: null },
      });

  const data = {
    url: input.url,
    normalizedUrl,
    title: (input.title || domain || input.url).slice(0, 500),
    description: (input.description || "").slice(0, 2000),
    rawText: (input.rawText || "").slice(0, 8000),
    aiSummary: (input.aiSummary || "").slice(0, 2000),
    aiAnalysisJson: (input.aiAnalysisJson || existing?.aiAnalysisJson || "{}").slice(0, 12000),
    aiAnalyzedAt: input.aiAnalyzedAt ? new Date(input.aiAnalyzedAt) : existing?.aiAnalyzedAt,
    sourceType,
    platform,
    domain,
    imageUrl: (input.imageUrl || "").slice(0, 500),
    faviconUrl: (input.faviconUrl || "").slice(0, 500),
    notes: (input.notes || "").slice(0, 2000),
    categorySlug: input.categorySlug || "",
    status: input.status || "active",
    importance: input.importance ?? 0,
    language: input.language || "",
    isFavorite: !!input.isFavorite,
    isArchived: !!input.isArchived,
    localId: input.localId || existing?.localId || "",
    lastSyncedAt: new Date(),
    deletedAt: null as Date | null,
  };

  let link;
  if (existing) {
    const clientUpdated = input.updatedAt ? new Date(input.updatedAt) : null;
    if (clientUpdated && clientUpdated < existing.updatedAt) {
      return existing;
    }
    link = await prisma.linkSlashLink.update({
      where: { id: existing.id },
      data,
    });
  } else {
    link = await prisma.linkSlashLink.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        ...data,
      },
    });
  }

  if (input.tags?.length) {
    await upsertTagsForLink(ctx, link.id, input.tags);
  }

  return link;
}

export async function pushSync(ctx: SyncContext, changes: ChangeOp[]) {
  const applied: Array<{ localId?: string; cloudId: string; entityType: string; op: string }> = [];
  const errors: Array<{ localId?: string; error: string }> = [];

  for (const change of changes) {
    try {
      if (change.entityType === "link") {
        if (change.op === "delete") {
          const cloudId = change.cloudId;
          if (!cloudId) continue;
          await prisma.linkSlashLink.updateMany({
            where: { id: cloudId, tenantId: ctx.tenantId, userId: ctx.userId },
            data: { deletedAt: new Date(), updatedAt: new Date() },
          });
          applied.push({ localId: change.localId, cloudId, entityType: "link", op: "delete" });
          await logSync(ctx, "push", "link", cloudId, "ok", change);
          continue;
        }

        const data = (change.data || {}) as LinkInput;
        if (!data.url) throw new Error("URL gerekli");
        const link = await upsertCloudLink(ctx, {
          ...data,
          cloudId: change.cloudId || data.cloudId,
          localId: change.localId || data.localId,
          updatedAt: change.updatedAt,
        });
        applied.push({ localId: change.localId || data.localId, cloudId: link.id, entityType: "link", op: change.op });
        await logSync(ctx, "push", "link", link.id, "ok", { localId: change.localId, op: change.op });
        continue;
      }

      if (change.entityType === "category") {
        const data = change.data || {};
        const name = String(data.name || "");
        const slug = String(data.slug || slugifyTag(name));
        if (!name) throw new Error("Kategori adı gerekli");

        const category = await prisma.linkSlashCategory.upsert({
          where: {
            tenantId_userId_slug: { tenantId: ctx.tenantId, userId: ctx.userId, slug },
          },
          create: {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            name,
            slug,
            emoji: String(data.emoji || ""),
            color: String(data.color || "#6366f1"),
            sortOrder: Number(data.sortOrder || 0),
          },
          update: {
            name,
            emoji: String(data.emoji || ""),
            color: String(data.color || "#6366f1"),
            sortOrder: Number(data.sortOrder || 0),
            updatedAt: new Date(),
          },
        });
        applied.push({ localId: change.localId || slug, cloudId: category.id, entityType: "category", op: change.op });
        continue;
      }

      if (change.entityType === "tag") {
        const data = change.data || {};
        const name = String(data.name || "");
        const slug = slugifyTag(String(data.slug || name));
        if (!name) throw new Error("Etiket adı gerekli");

        const tag = await prisma.linkSlashTag.upsert({
          where: {
            tenantId_userId_slug: { tenantId: ctx.tenantId, userId: ctx.userId, slug },
          },
          create: {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            name,
            slug,
            color: String(data.color || ""),
          },
          update: { name, updatedAt: new Date() },
        });
        applied.push({ localId: change.localId || slug, cloudId: tag.id, entityType: "tag", op: change.op });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Push hatası";
      errors.push({ localId: change.localId, error: msg });
      await logSync(ctx, "push", change.entityType, change.cloudId || change.localId || "", "error", change, msg);
    }
  }

  return { applied, errors, serverTime: new Date().toISOString() };
}

export async function markSynced(
  ctx: SyncContext,
  items: Array<{ entityType: string; localId?: string; cloudId: string }>
) {
  for (const item of items) {
    if (item.entityType !== "link" || !item.cloudId) continue;
    await prisma.linkSlashLink.updateMany({
      where: { id: item.cloudId, tenantId: ctx.tenantId, userId: ctx.userId },
      data: {
        localId: item.localId || "",
        lastSyncedAt: new Date(),
      },
    });
    await logSync(ctx, "mark", "link", item.cloudId, "ok", item);
  }
  return { marked: items.length };
}

export async function resolveConflict(
  ctx: SyncContext,
  input: {
    entityType: string;
    cloudId: string;
    localId?: string;
    winner: "server" | "client";
    data?: LinkInput;
  }
) {
  if (input.entityType !== "link") {
    throw new Error("Şimdilik sadece link conflict destekleniyor");
  }

  if (input.winner === "server") {
    const link = await prisma.linkSlashLink.findFirst({
      where: { id: input.cloudId, tenantId: ctx.tenantId, userId: ctx.userId },
      include: { linkTags: { include: { tag: true } } },
    });
    if (!link) throw new Error("Cloud link bulunamadı");
    await logSync(ctx, "resolve", "link", link.id, "ok", { winner: "server" });
    return serializeLink(link);
  }

  if (!input.data?.url) throw new Error("Client data gerekli");
  const link = await upsertCloudLink(ctx, {
    ...input.data,
    cloudId: input.cloudId,
    localId: input.localId,
  });
  const updated = await prisma.linkSlashLink.findFirst({
    where: { id: link.id },
    include: { linkTags: { include: { tag: true } } },
  });
  if (!updated) throw new Error("Güncelleme başarısız");
  await logSync(ctx, "resolve", "link", updated.id, "ok", { winner: "client" });
  return serializeLink(updated);
}

export async function cloudLinkFromCapture(
  ctx: SyncContext,
  capture: {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
    sourceType: string;
    tagsJson: string;
    aiSummary: string;
    aiCategory: string;
  }
) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(capture.tagsJson || "[]");
  } catch {
    tags = [];
  }

  return upsertCloudLink(ctx, {
    url: capture.url,
    title: capture.title,
    description: capture.description,
    aiSummary: capture.aiSummary,
    sourceType: capture.sourceType,
    domain: capture.domain,
    imageUrl: capture.image,
    faviconUrl: capture.favicon,
    categorySlug: capture.aiCategory,
    tags,
    notes: capture.sourceType ? `Extension · ${capture.sourceType}` : "",
  });
}
