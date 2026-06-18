export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "SUPPORT" | "ACCOUNTING" | "WAREHOUSE" | "DEALER" | "DEALER_SUB_USER";

export const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPPORT", "ACCOUNTING", "WAREHOUSE"];
export const ELEVATED_ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN"];

export function getAdminSecretPath(): string {
  return process.env.ADMIN_SECRET_PATH || "/x-control-eu-7294";
}

export function getAdminLoginPath(): string {
  return `${getAdminSecretPath()}/login`;
}

/** Map internal /admin routes to the public secret URL prefix. */
export function toAdminUrl(path: string = "/admin"): string {
  const secret = getAdminSecretPath();
  if (!path || path === "/admin") return secret;
  return path.startsWith("/admin") ? path.replace(/^\/admin/, secret) : `${secret}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isAdminRole(role?: string): boolean {
  return ADMIN_ROLES.includes((role || "").toUpperCase() as AdminRole);
}

export function isSuperAdmin(role?: string): boolean {
  return role === "SUPER_ADMIN";
}

export function isElevatedRole(role?: string): boolean {
  return ELEVATED_ROLES.includes(role as AdminRole);
}

export function canSeeAdminEntry(role?: string): boolean {
  return isAdminRole(role);
}

export function isAdminPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  const secret = getAdminSecretPath();
  return pathname === secret || pathname.startsWith(`${secret}/`);
}

export function isAdminLoginPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin/login" || pathname === getAdminLoginPath();
}

export async function logAdminActivity(data: {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadataJson?: string;
}) {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.adminActivityLog.create({ data });
  } catch {}
}
