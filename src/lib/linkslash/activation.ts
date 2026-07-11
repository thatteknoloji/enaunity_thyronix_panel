import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { LINKSLASH_MODULE_KEY } from "./access";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(len = 4): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function generateActivationCode(): string {
  return `LS-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

export async function createActivationCodes(count: number, durationDays: number, adminId: string) {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateActivationCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.linkSlashActivationCode.create({
          data: { code, durationDays, createdByAdminId: adminId, product: LINKSLASH_MODULE_KEY },
        });
        codes.push(code);
        break;
      } catch {
        code = generateActivationCode();
      }
    }
  }
  return codes;
}

export async function redeemActivationCode(code: string, userId: string, dealerId: string | null | undefined) {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.linkSlashActivationCode.findUnique({ where: { code: normalized } });
  if (!row || row.status !== "active") {
    return { ok: false as const, error: "Geçersiz veya kullanılmış aktivasyon kodu" };
  }
  if (!dealerId) {
    return { ok: false as const, error: "Aktivasyon için bayi hesabı gerekli" };
  }

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + row.durationDays);

  const existing = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey: LINKSLASH_MODULE_KEY },
    orderBy: { createdAt: "desc" },
  });

  let licenseId: string;
  if (existing) {
    const updated = await prisma.moduleLicense.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        lifecycleStage: "active",
        startsAt: new Date(),
        endsAt,
        metadataJson: JSON.stringify({ maxDevices: 1, activatedViaCode: normalized }),
      },
    });
    licenseId = updated.id;
  } else {
    const created = await prisma.moduleLicense.create({
      data: {
        dealerId,
        moduleKey: LINKSLASH_MODULE_KEY,
        planKey: "starter",
        status: "ACTIVE",
        lifecycleStage: "active",
        startsAt: new Date(),
        endsAt,
        metadataJson: JSON.stringify({ maxDevices: 1, activatedViaCode: normalized }),
      },
    });
    licenseId = created.id;
  }

  await prisma.linkSlashActivationCode.update({
    where: { id: row.id },
    data: {
      status: "used",
      usedByUserId: userId,
      usedByDealerId: dealerId,
      usedAt: new Date(),
    },
  });

  return { ok: true as const, licenseId, durationDays: row.durationDays, endsAt: endsAt.toISOString() };
}

export async function revokeActivationCode(id: string) {
  return prisma.linkSlashActivationCode.update({ where: { id }, data: { status: "revoked" } });
}

export async function listActivationCodes(limit = 100) {
  return prisma.linkSlashActivationCode.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
