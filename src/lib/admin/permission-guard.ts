import { requireAdmin } from "@/lib/auth";
import type { User } from "@/types";

function parsePerms(user: User & { adminRole?: { permissions: string } }): string[] {
  if (!user.adminRole?.permissions) return ["*"];
  try {
    return JSON.parse(user.adminRole.permissions);
  } catch {
    return [];
  }
}

export async function requireHiveView(): Promise<User> {
  const user = await requireAdmin();
  const perms = parsePerms(user);
  if (perms.includes("*") || perms.includes("hive_view")) return user;
  throw new Error("Forbidden");
}

export async function requireThyronixView(): Promise<User> {
  const user = await requireAdmin();
  const perms = parsePerms(user);
  if (perms.includes("*") || perms.includes("thyronix_view")) return user;
  throw new Error("Forbidden");
}
