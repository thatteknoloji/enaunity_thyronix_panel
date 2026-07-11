import { prisma } from "@/lib/db";
import type { User } from "@/types";

export type SecurityAccount = {
  kind: "user" | "subuser";
  id: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  totpSecret: string | null;
};

export async function resolveSecurityAccount(user: User): Promise<SecurityAccount | null> {
  if (user.isSubUser) {
    const sub = await prisma.subUser.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, totpEnabled: true, totpSecret: true, active: true },
    });
    if (!sub || !sub.active) return null;
    return { kind: "subuser", id: sub.id, email: sub.email, name: sub.name, totpEnabled: sub.totpEnabled, totpSecret: sub.totpSecret };
  }

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, totpEnabled: true, totpSecret: true },
  });
  if (!u) return null;
  return { kind: "user", id: u.id, email: u.email, name: u.name, totpEnabled: u.totpEnabled, totpSecret: u.totpSecret };
}

export async function updateSecurityAccount(
  account: SecurityAccount,
  data: Partial<{ password: string; totpSecret: string | null; totpEnabled: boolean; passwordResetToken: string | null; passwordResetExpires: Date | null }>,
) {
  if (account.kind === "subuser") {
    return prisma.subUser.update({ where: { id: account.id }, data });
  }
  return prisma.user.update({ where: { id: account.id }, data });
}
