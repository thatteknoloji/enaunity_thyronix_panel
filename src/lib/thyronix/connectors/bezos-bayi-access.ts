import type { User } from "@/types";
import { isPlatformAdmin } from "@/lib/product-auth/admin-bypass";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** CLI / migration script'leri için opsiyonel hedef e-posta listesi */
export function getBezosAllowedEmails(): string[] {
  const raw = process.env.BEZOS_BAYI_ALLOWED_EMAILS || process.env.BEZOS_BAYI_TARGET_EMAILS || "";
  return [...new Set(raw.split(",").map((v) => normalizeEmail(v)).filter(Boolean))];
}

export function isBezosAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = getBezosAllowedEmails();
  return allowed.length > 0 && allowed.includes(normalizeEmail(email));
}

/** THYRONIX lisanslı bayi veya platform admin — e-posta whitelist değil. */
export function canAccessBezosConnector(user: Pick<User, "role" | "email" | "dealerId">): boolean {
  if (isPlatformAdmin(user.role) || user.role === "admin") return true;
  return Boolean(user.dealerId);
}
