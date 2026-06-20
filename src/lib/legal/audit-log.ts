import { prisma } from "@/lib/db";

/** Append-only audit log — insert only */
export async function appendLegalAuditLog(input: {
  eventType: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
  email?: string;
  ipAddress?: string;
}) {
  return prisma.legalAuditLog.create({
    data: {
      eventType: input.eventType,
      payload: JSON.stringify(input.payload || {}),
      userId: input.userId || null,
      email: input.email || "",
      ipAddress: input.ipAddress || "",
    },
  });
}
