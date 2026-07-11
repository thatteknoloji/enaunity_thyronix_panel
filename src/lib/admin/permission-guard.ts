import { requireAdmin } from "@/lib/auth";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import type { User } from "@/types";

function parsePerms(user: User & { adminRole?: { permissions: string } }): string[] {
  if (!user.adminRole?.permissions) return ["*"];
  try {
    return JSON.parse(user.adminRole.permissions);
  } catch {
    return [];
  }
}

/** Admin without assigned role = full access (legacy super admins). */
export function adminHasPermission(
  user: User & { adminRole?: { permissions: string } },
  permission: PermissionKey
): boolean {
  if (!user.adminRole?.permissions) return true;
  return hasPermission(parsePerms(user), permission);
}

export async function requireAdminPermission(permission: PermissionKey): Promise<User> {
  const user = await requireAdmin();
  if (!adminHasPermission(user, permission)) throw new Error("Forbidden");
  return user;
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
