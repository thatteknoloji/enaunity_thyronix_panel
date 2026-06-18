import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";
import { isAdminRole } from "@/lib/auth/admin-access";
import {
  LINK_STATUSES,
  PRODUCT_LOGIN_PATHS,
  PRODUCT_TYPES,
  type LinkStatus,
  type ProductLinkMetadata,
  type ProductType,
} from "./types";

function isProductType(value: string): value is ProductType {
  return PRODUCT_TYPES.includes(value as ProductType);
}

function isLinkStatus(value: string): value is LinkStatus {
  return LINK_STATUSES.includes(value as LinkStatus);
}

function buildUsername(email: string, productType: ProductType): string {
  const local = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24);
  return `${local}-${productType.toLowerCase()}`.toLowerCase();
}

function generateTempPassword(): string {
  return `ENA-${Math.random().toString(36).slice(2, 10)}!`;
}

export async function getActiveLink(enaUserId: string, productType: ProductType) {
  return prisma.productAccountLink.findFirst({
    where: {
      enaUserId,
      productType,
      status: { in: ["PENDING", "LINKED"] },
    },
    include: { externalUser: true, enaUser: { select: { id: true, email: true, name: true, role: true, dealerId: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLinkById(id: string) {
  return prisma.productAccountLink.findUnique({
    where: { id },
    include: {
      externalUser: true,
      enaUser: { select: { id: true, email: true, name: true, role: true, dealerId: true } },
    },
  });
}

export async function listLinksForUser(enaUserId: string) {
  return prisma.productAccountLink.findMany({
    where: { enaUserId, status: { not: "DELETED" } },
    include: { externalUser: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listAllLinks(filters?: { productType?: string; status?: string }) {
  return prisma.productAccountLink.findMany({
    where: {
      ...(filters?.productType ? { productType: filters.productType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      externalUser: true,
      enaUser: { select: { id: true, email: true, name: true, role: true, dealerId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function assertCanLinkProduct(
  enaUser: { id: string; role: string; dealerId?: string | null },
  productType: ProductType
): Promise<{ ok: true } | { ok: false; reason: string; code: string }> {
  if (!isProductType(productType)) {
    return { ok: false, reason: "Geçersiz ürün tipi", code: "INVALID_PRODUCT" };
  }

  if (isAdminRole(enaUser.role)) {
    return { ok: true };
  }

  if (!enaUser.dealerId) {
    return { ok: false, reason: "Bu ürün için bayi hesabı gerekli", code: "DEALER_REQUIRED" };
  }

  const hasAccess = await hasModuleAccess(enaUser.dealerId, productType);
  if (!hasAccess) {
    return { ok: false, reason: "Bu ürün için aktif lisans bulunamadı", code: "LISANS_YOK" };
  }

  return { ok: true };
}

export async function createProductAccountLink(
  enaUser: { id: string; email: string; name: string; role: string; dealerId?: string | null },
  productType: ProductType,
  options?: { username?: string; password?: string; createdFrom?: ProductLinkMetadata["createdFrom"] }
) {
  const access = await assertCanLinkProduct(enaUser, productType);
  if (!access.ok) throw new Error(access.reason);

  const existing = await getActiveLink(enaUser.id, productType);
  if (existing?.status === "LINKED") {
    throw new Error("Bu ürün için zaten bağlı bir hesap var");
  }

  const tempPassword = options?.password || generateTempPassword();
  const username = options?.username || buildUsername(enaUser.email, productType);
  const hashed = await hashPassword(tempPassword);

  const metadata: ProductLinkMetadata = {
    createdFrom: options?.createdFrom || "gateway",
    tempPasswordIssued: !options?.password,
  };

  const result = await prisma.$transaction(async (tx) => {
    const priorLink = await tx.productAccountLink.findUnique({
      where: { enaUserId_productType: { enaUserId: enaUser.id, productType } },
    });

    if (priorLink && (priorLink.status === "LINKED" || priorLink.status === "PENDING")) {
      throw new Error("Bu ürün için zaten bağlı bir hesap var");
    }

    const existingExternal = await tx.productExternalUser.findUnique({
      where: { productType_email: { productType, email: enaUser.email } },
    });

    const externalUser = existingExternal
      ? await tx.productExternalUser.update({
          where: { id: existingExternal.id },
          data: {
            username,
            password: hashed,
            name: enaUser.name,
            status: "ACTIVE",
            metadataJson: JSON.stringify({ sourceEnaUserId: enaUser.id, relinkedAt: new Date().toISOString() }),
          },
        })
      : await tx.productExternalUser.create({
          data: {
            productType,
            email: enaUser.email,
            username,
            password: hashed,
            name: enaUser.name,
            metadataJson: JSON.stringify({ sourceEnaUserId: enaUser.id }),
          },
        });

    const linkData = {
      externalUserId: externalUser.id,
      externalEmail: externalUser.email,
      externalUsername: externalUser.username,
      status: "LINKED" as const,
      linkedAt: new Date(),
      metadataJson: JSON.stringify(metadata),
    };

    const link = priorLink
      ? await tx.productAccountLink.update({
          where: { id: priorLink.id },
          data: linkData,
          include: { externalUser: true },
        })
      : await tx.productAccountLink.create({
          data: {
            enaUserId: enaUser.id,
            productType,
            ...linkData,
          },
          include: { externalUser: true },
        });

    return { link, tempPassword: options?.password ? undefined : tempPassword };
  });

  return result;
}

export async function relinkProductAccount(
  linkId: string,
  actor: { id: string; role: string },
  options?: { force?: boolean }
) {
  const link = await getLinkById(linkId);
  if (!link) throw new Error("Bağlantı bulunamadı");

  const isAdmin = isAdminRole(actor.role);
  if (!isAdmin && link.enaUserId !== actor.id) {
    throw new Error("Bu bağlantıyı yeniden eşleştirme yetkiniz yok");
  }

  if (!options?.force && link.status === "LINKED") {
    throw new Error("Aktif bağlantı zorla yeniden eşleştirme gerektirir");
  }

  await prisma.productAccountLink.update({
    where: { id: linkId },
    data: { status: "DELETED" },
  });

  return createProductAccountLink(link.enaUser, link.productType as ProductType, {
    createdFrom: isAdmin ? "admin" : "api",
  });
}

export async function updateLinkStatus(
  linkId: string,
  status: LinkStatus,
  actor: { id: string; role: string }
) {
  if (!isLinkStatus(status)) throw new Error("Geçersiz durum");

  const link = await getLinkById(linkId);
  if (!link) throw new Error("Bağlantı bulunamadı");

  const isAdmin = isAdminRole(actor.role);
  if (!isAdmin && link.enaUserId !== actor.id) {
    throw new Error("Bu bağlantıyı yönetme yetkiniz yok");
  }

  return prisma.productAccountLink.update({
    where: { id: linkId },
    data: {
      status,
      ...(status === "LINKED" ? { linkedAt: new Date() } : {}),
    },
    include: { externalUser: true, enaUser: { select: { id: true, email: true, name: true } } },
  });
}

export async function deleteProductLink(linkId: string, actor: { id: string; role: string }) {
  return updateLinkStatus(linkId, "DELETED", actor);
}

export async function recordProductLogin(enaUserId: string, productType: ProductType) {
  const link = await getActiveLink(enaUserId, productType);
  if (!link || link.status !== "LINKED") return null;

  return prisma.productAccountLink.update({
    where: { id: link.id },
    data: { lastLoginAt: new Date() },
  });
}

export function getProductLoginRedirect(productType: ProductType, email?: string) {
  const base = PRODUCT_LOGIN_PATHS[productType];
  if (!email) return base;
  return `${base}?email=${encodeURIComponent(email)}`;
}

export async function resolveGatewayState(
  enaUser: { id: string; email: string; name: string; role: string; dealerId?: string | null },
  productType: ProductType
) {
  const access = await assertCanLinkProduct(enaUser, productType);
  if (!access.ok) {
    return { step: "no_license" as const, reason: access.reason, code: access.code };
  }

  const link = await getActiveLink(enaUser.id, productType);
  if (!link) {
    return { step: "setup" as const, productType };
  }

  if (link.status === "DISABLED") {
    return { step: "disabled" as const, link };
  }

  if (link.status === "PENDING") {
    return { step: "pending" as const, link };
  }

  return {
    step: "ready" as const,
    link,
    redirectTo: getProductLoginRedirect(productType, link.externalEmail),
  };
}
