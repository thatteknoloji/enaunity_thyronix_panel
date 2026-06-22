import type { User } from "@/types";

const DEFAULT_ALLOWED_EMAILS = [
  "esraguden840@gmail.com",
  "esragunen840@gmail.com",
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getBezosAllowedEmails(): string[] {
  const raw = process.env.BEZOS_BAYI_ALLOWED_EMAILS || process.env.BEZOS_BAYI_TARGET_EMAILS || "";
  const fromEnv = raw
    .split(",")
    .map((v) => normalizeEmail(v))
    .filter(Boolean);
  const merged = fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_EMAILS;
  return [...new Set(merged)];
}

export function isBezosAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = getBezosAllowedEmails();
  return allowed.includes(normalizeEmail(email));
}

export function canAccessBezosConnector(user: Pick<User, "role" | "email">): boolean {
  if (user.role === "admin") return true;
  return isBezosAllowedEmail(user.email);
}
