import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Next.js dev HMR eski Prisma singleton'ı tutabiliyor — yeni modeller undefined kalır. */
function createPrismaClient() {
  return new PrismaClient();
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && typeof cached.paymentGatewaySettings?.upsert === "function") {
    return cached;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
