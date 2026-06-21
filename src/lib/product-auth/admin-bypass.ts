import { isAdminRole, isSuperAdmin } from "@/lib/auth/admin-access";

/** ENA platform yöneticisi (SUPER_ADMIN, ADMIN, … veya legacy admin rolü) */
export function isPlatformAdmin(role?: string | null): boolean {
  if (!role) return false;
  return isAdminRole(role) || role.toLowerCase() === "admin";
}

/** Süper admin ve platform admin — ürün oturumu / lisans kontrolü atlanır */
export function bypassesProductLicense(role?: string | null): boolean {
  return isSuperAdmin(role || undefined) || isPlatformAdmin(role);
}

export async function establishAdminProductSession(product: "THYRONIX" | "HIVE"): Promise<boolean> {
  const path = product === "THYRONIX" ? "/api/thyronix/session" : "/api/hive/session";
  try {
    const res = await fetch(path, { method: "POST" });
    const d = await res.json();
    return res.ok && d.success;
  } catch {
    return false;
  }
}
