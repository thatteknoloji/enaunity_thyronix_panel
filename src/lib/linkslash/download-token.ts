import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_TTL_MS = 10 * 60 * 1000;

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createDownloadToken(input: {
  userId: string;
  dealerId: string | null | undefined;
  apkReleaseId?: string;
}) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const row = await prisma.linkSlashDownloadToken.create({
    data: {
      token,
      userId: input.userId,
      dealerId: input.dealerId || "",
      apkReleaseId: input.apkReleaseId || "",
      expiresAt,
    },
  });
  return {
    token: row.token,
    expiresAt: row.expiresAt.toISOString(),
    downloadUrl: `/api/linkslash/download/${row.token}`,
  };
}

export async function consumeDownloadToken(token: string) {
  const row = await prisma.linkSlashDownloadToken.findUnique({ where: { token } });
  if (!row) return { ok: false as const, code: "NOT_FOUND" as const };
  if (row.usedAt) return { ok: false as const, code: "USED" as const };
  if (row.expiresAt < new Date()) return { ok: false as const, code: "EXPIRED" as const };

  await prisma.linkSlashDownloadToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return { ok: true as const, row };
}
