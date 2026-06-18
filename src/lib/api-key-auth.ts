import { prisma } from "@/lib/db";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export async function verifyApiKey(req: Request): Promise<{ dealerId: string | null; keyId: string; name: string; rateLimit: number } | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  const key = await prisma.apiKey.findUnique({ where: { key: apiKey } });
  if (!key || !key.active) return null;

  const now = Date.now();
  const entry = rateLimitMap.get(apiKey);
  if (entry && entry.resetAt > now) {
    if (entry.count >= key.rateLimit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter);
    }
    entry.count++;
  } else {
    rateLimitMap.set(apiKey, { count: 1, resetAt: now + 60000 });
  }

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } }).catch(() => {});

  return { dealerId: key.dealerId, keyId: key.id, name: key.name, rateLimit: key.rateLimit };
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super("rate_limit");
    this.retryAfter = retryAfter;
  }
}
