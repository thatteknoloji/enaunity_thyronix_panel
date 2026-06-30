import { randomBytes } from "crypto";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import path from "path";
import type { ReadStream } from "fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createNotification, sendEmail } from "@/lib/notifications";
import {
  canUnlockDigitalDelivery,
  digitalModeLabel,
  parseDigitalDeliverySnapshot,
  type DigitalDeliverySnapshot,
} from "@/lib/products/digital-delivery";

const TOKEN_TTL_MS = 10 * 60 * 1000;

type Tx = Prisma.TransactionClient;

type SessionLike = {
  id: string;
  role?: string;
  dealerId?: string | null;
  email?: string | null;
  name?: string | null;
};

type GrantActor = {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
};

type OrderWithDigitalContext = Awaited<ReturnType<typeof getOrderWithDigitalContext>>;
type DigitalOrder = NonNullable<OrderWithDigitalContext>;
type DigitalOrderItem = DigitalOrder["items"][number];
type GrantWithRelations = Prisma.DigitalAccessGrantGetPayload<{
  include: {
    orderItem: {
      include: {
        product: { select: { name: true } };
        productCatalogItem: { select: { name: true } };
      };
    };
    logs: true;
  };
}>;

export type DigitalDeliveryPresentation = {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  mode: string;
  modeLabel: string;
  status: string;
  statusLabel: string;
  canAccess: boolean;
  assetName: string;
  assetUrl: string;
  accessInstructions: string;
  licenseValue: string;
  licenseSource: string;
  requiresApproval: boolean;
  downloadLimit: number;
  downloadCount: number;
  deliveredAt: string | null;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  logs: Array<{
    id: string;
    eventType: string;
    actorType: string;
    note: string;
    createdAt: string;
  }>;
};

export type DigitalLibraryEntry = DigitalDeliveryPresentation & {
  orderNumber: string;
  orderStatus: string;
  orderCreatedAt: string;
  customerName: string;
  dealerName: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function randomToken() {
  return randomBytes(24).toString("hex");
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeAssetUrl(assetUrl: string) {
  return String(assetUrl || "").trim();
}

function resolveGrantStatus(orderStatus: string, snapshot: DigitalDeliverySnapshot) {
  if (orderStatus === "cancelled") return "revoked";
  return canUnlockDigitalDelivery(orderStatus, snapshot) ? "active" : "pending";
}

function grantStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Teslim Açık";
    case "revoked":
      return "Erişim Kapalı";
    default:
      return "Ödeme / Onay Bekliyor";
  }
}

function renderLicenseTemplate(template: string, ctx: {
  orderId: string;
  orderNumber: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  dealerName: string;
  dealerCompany: string;
  date: Date;
}) {
  return String(template || "")
    .replace(/\{ORDER_ID\}/g, ctx.orderId)
    .replace(/\{ORDER_NO\}/g, ctx.orderNumber)
    .replace(/\{PRODUCT_NAME\}/g, ctx.productName)
    .replace(/\{CUSTOMER_NAME\}/g, ctx.customerName)
    .replace(/\{CUSTOMER_EMAIL\}/g, ctx.customerEmail)
    .replace(/\{DEALER_NAME\}/g, ctx.dealerName)
    .replace(/\{DEALER_COMPANY\}/g, ctx.dealerCompany)
    .replace(/\{DATE\}/g, ctx.date.toLocaleDateString("tr-TR"));
}

function getItemProductName(item: DigitalOrderItem) {
  return item.product?.name || item.productCatalogItem?.name || item.name || "Dijital Ürün";
}

function resolveSnapshotFromItem(item: DigitalOrderItem) {
  const metadata = parseJson<{ digitalDelivery?: unknown }>(item.metadataJson, {});
  const parsed = parseDigitalDeliverySnapshot(metadata.digitalDelivery);
  if (parsed) return parsed;
  if (item.product && item.product.productType === "digital") {
    return {
      isDigital: true,
      productType: "digital" as const,
      mode: (item.product.digitalDeliveryMode || "") as DigitalDeliverySnapshot["mode"],
      assetUrl: item.product.digitalAssetUrl || "",
      assetName: item.product.digitalAssetName || "",
      instructions: item.product.digitalAccessInstructions || "",
      downloadLimit: item.product.digitalDownloadLimit || 0,
      licenseTemplate: item.product.digitalLicenseTemplate || "",
      requiresApproval: Boolean(item.product.digitalRequiresApproval),
    };
  }
  return null;
}

async function logGrantEvent(
  db: typeof prisma | Tx,
  input: {
    grantId: string;
    eventType: string;
    actorType?: string;
    actorId?: string;
    note?: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.digitalAccessLog.create({
    data: {
      grantId: input.grantId,
      eventType: input.eventType,
      actorType: input.actorType || "system",
      actorId: input.actorId || "",
      note: input.note || "",
      payloadJson: JSON.stringify(input.payload || {}),
    },
  });
}

async function assignLicenseValue(
  db: typeof prisma | Tx,
  input: {
    grantId: string;
    productId?: string | null;
    existingLicenseValue: string;
    snapshot: DigitalDeliverySnapshot;
    order: DigitalOrder;
    item: DigitalOrderItem;
  },
) {
  if (input.existingLicenseValue) {
    return { licenseValue: input.existingLicenseValue, licenseSource: "existing" };
  }

  if (input.productId) {
    const pooled = await db.digitalLicensePoolItem.findFirst({
      where: { productId: input.productId, status: "available" },
      orderBy: { createdAt: "asc" },
    });
    if (pooled) {
      await db.digitalLicensePoolItem.update({
        where: { id: pooled.id },
        data: {
          status: "assigned",
          assignedGrantId: input.grantId,
          assignedAt: new Date(),
        },
      });
      return {
        licenseValue: pooled.code,
        licenseSource: pooled.label ? `pool:${pooled.label}` : "pool",
      };
    }
  }

  if (input.snapshot.licenseTemplate) {
    return {
      licenseValue: renderLicenseTemplate(input.snapshot.licenseTemplate, {
        orderId: input.order.id,
        orderNumber: input.order.orderNumber || input.order.id.slice(0, 8).toUpperCase(),
        productName: getItemProductName(input.item),
        customerName: input.order.user?.name || "",
        customerEmail: input.order.user?.email || "",
        dealerName: input.order.dealer?.name || "",
        dealerCompany: input.order.dealer?.company || "",
        date: new Date(),
      }),
      licenseSource: "template",
    };
  }

  return { licenseValue: "", licenseSource: "" };
}

async function getOrderWithDigitalContext(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      dealer: { select: { id: true, name: true, company: true, email: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productType: true,
              digitalDeliveryMode: true,
              digitalAssetUrl: true,
              digitalAssetName: true,
              digitalAccessInstructions: true,
              digitalDownloadLimit: true,
              digitalLicenseTemplate: true,
              digitalRequiresApproval: true,
            },
          },
          productCatalogItem: { select: { id: true, name: true } },
          digitalAccessGrants: true,
        },
      },
    },
  });
}

async function ensureGrantForItem(
  db: typeof prisma | Tx,
  order: DigitalOrder,
  item: DigitalOrderItem,
) {
  const snapshot = resolveSnapshotFromItem(item);
  if (!snapshot?.isDigital) return null;

  const existing = item.digitalAccessGrants[0] || null;
  const existingMeta = existing ? parseJson<{ manualStatus?: string }>(existing.metadataJson, {}) : {};
  const resolvedStatus = resolveGrantStatus(order.status, snapshot);
  const desiredStatus =
    order.status === "cancelled"
      ? "revoked"
      : existingMeta.manualStatus === "active" || existingMeta.manualStatus === "revoked"
        ? existingMeta.manualStatus
        : resolvedStatus;

  const baseData = {
    orderId: order.id,
    orderItemId: item.id,
    userId: order.userId,
    dealerId: order.dealerId || null,
    productId: item.productId || null,
    mode: snapshot.mode || "",
    assetUrl: normalizeAssetUrl(snapshot.assetUrl),
    assetName: snapshot.assetName || getItemProductName(item),
    accessInstructions: snapshot.instructions || "",
    requiresApproval: snapshot.requiresApproval,
    downloadLimit: snapshot.downloadLimit || 0,
    metadataJson: JSON.stringify({
      snapshot,
      orderStatus: order.status,
      productName: getItemProductName(item),
      manualStatus: existingMeta.manualStatus || "",
    }),
  };

  if (!existing) {
    const created = await db.digitalAccessGrant.create({
      data: {
        ...baseData,
        status: desiredStatus,
        deliveredAt: desiredStatus === "active" ? new Date() : null,
      },
    });

    const license = desiredStatus === "active"
      ? await assignLicenseValue(db, {
          grantId: created.id,
          productId: item.productId,
          existingLicenseValue: "",
          snapshot,
          order,
          item,
        })
      : { licenseValue: "", licenseSource: "" };

    const finalized = await db.digitalAccessGrant.update({
      where: { id: created.id },
      data: {
        licenseValue: license.licenseValue,
        licenseSource: license.licenseSource,
      },
    });

    await logGrantEvent(db, {
      grantId: finalized.id,
      eventType: "grant_created",
      note: `Dijital teslimat kaydı oluşturuldu (${grantStatusLabel(desiredStatus)})`,
      payload: { mode: snapshot.mode, status: desiredStatus },
    });
    return finalized;
  }

  const updates: Prisma.DigitalAccessGrantUpdateInput = {
    mode: baseData.mode,
    assetUrl: baseData.assetUrl,
    assetName: baseData.assetName,
    accessInstructions: baseData.accessInstructions,
    requiresApproval: baseData.requiresApproval,
    downloadLimit: baseData.downloadLimit,
    metadataJson: baseData.metadataJson,
  };

  if (existing.status !== desiredStatus) {
    updates.status = desiredStatus;
    if (desiredStatus === "active") {
      updates.deliveredAt = existing.deliveredAt || new Date();
      updates.revokedAt = null;
      updates.revokedBy = "";
    }
    if (desiredStatus === "revoked") {
      updates.revokedAt = new Date();
    }
  }

  let licenseValue = existing.licenseValue;
  let licenseSource = existing.licenseSource;
  if (desiredStatus === "active" && !licenseValue && snapshot.mode === "license") {
    const license = await assignLicenseValue(db, {
      grantId: existing.id,
      productId: item.productId,
      existingLicenseValue: existing.licenseValue,
      snapshot,
      order,
      item,
    });
    licenseValue = license.licenseValue;
    licenseSource = license.licenseSource;
    updates.licenseValue = licenseValue;
    updates.licenseSource = licenseSource;
  }

  const updated = await db.digitalAccessGrant.update({
    where: { id: existing.id },
    data: updates,
  });

  if (existing.status !== desiredStatus) {
    await logGrantEvent(db, {
      grantId: updated.id,
      eventType: desiredStatus === "active" ? "grant_activated" : desiredStatus === "revoked" ? "grant_revoked" : "grant_pending",
      note: `Dijital teslimat durumu ${grantStatusLabel(desiredStatus)} olarak güncellendi`,
      payload: { previousStatus: existing.status, nextStatus: desiredStatus },
    });
  }

  return updated;
}

function mapGrantToPresentation(
  grant: GrantWithRelations,
): DigitalDeliveryPresentation {
  const meta = parseJson<{ productName?: string }>(grant.metadataJson, {});
  return {
    id: grant.id,
    orderId: grant.orderId,
    orderItemId: grant.orderItemId,
    productId: grant.productId || null,
    productName:
      grant.orderItem?.product?.name ||
      grant.orderItem?.productCatalogItem?.name ||
      meta.productName ||
      "Dijital Ürün",
    mode: grant.mode,
    modeLabel: digitalModeLabel(grant.mode),
    status: grant.status,
    statusLabel: grantStatusLabel(grant.status),
    canAccess: grant.status === "active",
    assetName: grant.assetName,
    assetUrl: grant.assetUrl,
    accessInstructions: grant.accessInstructions,
    licenseValue: grant.licenseValue,
    licenseSource: grant.licenseSource,
    requiresApproval: grant.requiresApproval,
    downloadLimit: grant.downloadLimit,
    downloadCount: grant.downloadCount,
    deliveredAt: grant.deliveredAt?.toISOString() || null,
    lastAccessedAt: grant.lastAccessedAt?.toISOString() || null,
    revokedAt: grant.revokedAt?.toISOString() || null,
    logs: (grant.logs || []).map((log) => ({
      id: log.id,
      eventType: log.eventType,
      actorType: log.actorType,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function syncDigitalAccessGrants(orderId: string) {
  const order = await getOrderWithDigitalContext(orderId);
  if (!order) return [];

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await ensureGrantForItem(tx, order, item);
    }
  });

  const grants = await prisma.digitalAccessGrant.findMany({
    where: { orderId },
    include: {
      orderItem: {
        include: {
          product: { select: { name: true } },
          productCatalogItem: { select: { name: true } },
        },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 6 },
    },
    orderBy: { createdAt: "asc" },
  });

  return grants.map(mapGrantToPresentation);
}

export async function listDigitalLibraryEntriesForUser(user: SessionLike) {
  const orderWhere = user.dealerId
    ? { dealerId: user.dealerId, items: { some: { OR: [{ product: { is: { productType: "digital" } } }, { metadataJson: { contains: "\"productType\":\"digital\"" } }] } } }
    : { userId: user.id, items: { some: { OR: [{ product: { is: { productType: "digital" } } }, { metadataJson: { contains: "\"productType\":\"digital\"" } }] } } };

  const candidateOrders = await prisma.order.findMany({
    where: orderWhere,
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  for (const order of candidateOrders) {
    await syncDigitalAccessGrants(order.id);
  }

  const grants = await prisma.digitalAccessGrant.findMany({
    where: user.dealerId ? { dealerId: user.dealerId } : { userId: user.id },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          user: { select: { name: true } },
          dealer: { select: { company: true, name: true } },
        },
      },
      orderItem: {
        include: {
          product: { select: { name: true } },
          productCatalogItem: { select: { name: true } },
        },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 4 },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const entries: DigitalLibraryEntry[] = grants.map((grant) => ({
    ...mapGrantToPresentation(grant),
    orderNumber: grant.order.orderNumber || grant.order.id.slice(0, 8).toUpperCase(),
    orderStatus: grant.order.status,
    orderCreatedAt: grant.order.createdAt.toISOString(),
    customerName: grant.order.user?.name || "",
    dealerName: grant.order.dealer?.company || grant.order.dealer?.name || "",
  }));

  return entries;
}

export async function canAccessDigitalGrant(user: SessionLike, grantId: string) {
  const grant = await prisma.digitalAccessGrant.findUnique({
    where: { id: grantId },
    include: {
      order: { select: { id: true } },
      orderItem: {
        include: {
          product: { select: { name: true } },
          productCatalogItem: { select: { name: true } },
        },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });
  if (!grant) return null;
  const isAdmin = ["admin", "superadmin", "SUPER_ADMIN"].includes(String(user.role || ""));
  const owned = isAdmin || (user.dealerId ? grant.dealerId === user.dealerId : grant.userId === user.id);
  if (!owned) return null;
  return grant;
}

export async function createDigitalAccessToken(grantId: string, actor: SessionLike) {
  const grant = await canAccessDigitalGrant(actor, grantId);
  if (!grant) throw new Error("Dijital teslimata erişim yok");
  if (grant.status !== "active") throw new Error("Dijital teslimat henüz aktif değil");
  if (!grant.assetUrl) throw new Error("Bu teslimat için indirilebilir bağlantı yok");
  if (grant.downloadLimit > 0 && grant.downloadCount >= grant.downloadLimit) {
    throw new Error("İndirme limiti doldu");
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.digitalAccessToken.create({
    data: {
      grantId,
      token,
      expiresAt,
    },
  });

  await logGrantEvent(prisma, {
    grantId,
    eventType: "token_created",
    actorType: actor.role || "user",
    actorId: actor.id,
    note: "Güvenli erişim linki oluşturuldu",
    payload: { expiresAt: expiresAt.toISOString() },
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    url: `/api/digital-access/download/${token}`,
  };
}

export async function consumeDigitalAccessToken(token: string) {
  const row = await prisma.digitalAccessToken.findUnique({
    where: { token },
    include: {
      grant: true,
    },
  });

  if (!row) return { ok: false as const, code: "NOT_FOUND" as const };
  if (row.usedAt) return { ok: false as const, code: "USED" as const };
  if (row.expiresAt < new Date()) return { ok: false as const, code: "EXPIRED" as const };
  if (row.grant.status !== "active") return { ok: false as const, code: "REVOKED" as const };
  if (row.grant.downloadLimit > 0 && row.grant.downloadCount >= row.grant.downloadLimit) {
    return { ok: false as const, code: "LIMIT_REACHED" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.digitalAccessToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await tx.digitalAccessGrant.update({
      where: { id: row.grantId },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
    await logGrantEvent(tx, {
      grantId: row.grantId,
      eventType: "asset_accessed",
      note: "Dijital teslimat linki kullanıldı",
      payload: { tokenId: row.id },
    });
  });

  return { ok: true as const, grant: row.grant };
}

export async function resolveDigitalAssetResponse(assetUrl: string) {
  const normalized = normalizeAssetUrl(assetUrl);
  if (!normalized) return null;
  if (isHttpUrl(normalized)) {
    return {
      type: "redirect" as const,
      location: normalized,
    };
  }
  if (normalized.startsWith("/")) {
    return {
      type: "redirect" as const,
      location: normalized,
    };
  }

  const root = process.cwd();
  const cleaned = normalized.replace(/^\.?\//, "");
  const candidates = [
    path.isAbsolute(normalized) ? normalized : path.join(root, cleaned),
    path.join(root, "public", cleaned),
    path.join(root, "storage", cleaned),
  ];
  const fsPath = candidates.find((candidate) => existsSync(candidate));
  if (!fsPath) {
    return {
      type: "redirect" as const,
      location: `/${cleaned.replace(/^\/+/, "")}`,
    };
  }

  const fileStat = await stat(fsPath);
  const stream = createReadStream(fsPath);
  return {
    type: "stream" as const,
    stream,
    size: fileStat.size,
    fileName: path.basename(fsPath),
  };
}

async function getGrantDeliveryTarget(grantId: string) {
  const grant = await prisma.digitalAccessGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new Error("Dijital teslimat bulunamadı");
  return grant;
}

export async function setDigitalGrantStatus(
  grantId: string,
  action: "activate" | "revoke" | "restore",
  actor: GrantActor,
) {
  const current = await getGrantDeliveryTarget(grantId);
  let nextStatus = current.status;
  if (action === "activate" || action === "restore") nextStatus = "active";
  if (action === "revoke") nextStatus = "revoked";
  const metadata = parseJson<{ manualStatus?: string }>(current.metadataJson, {});

  const updated = await prisma.digitalAccessGrant.update({
    where: { id: grantId },
    data: {
      status: nextStatus,
      deliveredAt: nextStatus === "active" ? current.deliveredAt || new Date() : current.deliveredAt,
      revokedAt: nextStatus === "revoked" ? new Date() : null,
      revokedBy: nextStatus === "revoked" ? (actor.name || actor.email || actor.id) : "",
      metadataJson: JSON.stringify({
        ...metadata,
        manualStatus: nextStatus,
      }),
    },
  });

  await logGrantEvent(prisma, {
    grantId,
    eventType: `admin_${action}`,
    actorType: actor.role,
    actorId: actor.id,
    note:
      action === "revoke"
        ? "Admin erişimi kapattı"
        : action === "restore"
          ? "Admin erişimi yeniden açtı"
          : "Admin teslimatı manuel olarak açtı",
  });

  await syncDigitalAccessGrants(current.orderId);
  return updated;
}

export async function resendDigitalGrantAccess(grantId: string, actor: GrantActor) {
  const grant = await prisma.digitalAccessGrant.findUnique({
    where: { id: grantId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          dealerId: true,
          dealer: { select: { id: true, name: true, company: true, email: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      },
      orderItem: {
        include: {
          product: { select: { name: true } },
          productCatalogItem: { select: { name: true } },
        },
      },
    },
  });
  if (!grant) throw new Error("Dijital teslimat bulunamadı");

  const productName =
    grant.orderItem.product?.name || grant.orderItem.productCatalogItem?.name || "Dijital Ürün";
  const isDealer = Boolean(grant.order.dealerId);
  const panelLink = isDealer ? `/dealer/orders/${grant.order.id}` : `/products/digital-library`;
  const publicBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.enaunity.com.tr").replace(/\/+$/, "");
  const panelLinkAbsolute = `${publicBaseUrl}${panelLink}`;
  const emailTo = grant.order.dealer?.email || grant.order.user?.email || "";
  const targetDealerId = grant.order.dealer?.id || undefined;
  const targetUserId = !targetDealerId ? grant.order.user?.id : undefined;
  const orderNo = grant.order.orderNumber || grant.order.id.slice(0, 8).toUpperCase();

  await createNotification({
    dealerId: targetDealerId,
    userId: targetUserId,
    title: "Dijital teslimatınız hazır",
    message: `${productName} için dijital erişim kaydınız güncellendi. Sipariş #${orderNo} üzerinden görüntüleyebilirsiniz.`,
    type: "order",
    link: panelLink,
  });

  if (emailTo) {
    await sendEmail({
      to: emailTo,
      subject: `Dijital teslimat hazırlandı • ${productName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Dijital teslimatınız hazır</h2>
          <p><strong>${productName}</strong> için erişim bilgileriniz ENA panelinize işlendi.</p>
          <p>Sipariş No: <strong>${orderNo}</strong></p>
          <p><a href="${panelLinkAbsolute}">Panele gidin</a> ve teslimatı görüntüleyin.</p>
        </div>
      `,
    });
  }

  await logGrantEvent(prisma, {
    grantId,
    eventType: "delivery_resent",
    actorType: actor.role,
    actorId: actor.id,
    note: "Dijital teslimat bildirimi yeniden gönderildi",
    payload: { panelLink },
  });

  return true;
}

export type DigitalAssetTarget =
  | { type: "redirect"; location: string }
  | { type: "stream"; stream: ReadStream; size: number; fileName: string };
