import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

const DEFAULT_TIMEOUT_MS = 15_000;
const ALLOWED_DOMAINS: string[] = [];
const DENIED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0"];

export function validateImageUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, reason: "Geçersiz protokol" };
    }
    const host = parsed.hostname.toLowerCase();
    if (DENIED_DOMAINS.some((d) => host.includes(d))) {
      return { valid: false, reason: "Engellenen domain" };
    }
    if (ALLOWED_DOMAINS.length && !ALLOWED_DOMAINS.some((d) => host.endsWith(d))) {
      return { valid: false, reason: "Domain allowlist dışında" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Geçersiz URL" };
  }
}

export function getProductImageDir(productId: string): string {
  return path.join(process.cwd(), "storage", "products", productId);
}

export async function ensureProductImageDir(productId: string): Promise<string> {
  const dir = getProductImageDir(productId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function harvestProductImages(opts: {
  productId: string;
  imageUrls: string[];
  downloadImages?: boolean;
}): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (let i = 0; i < opts.imageUrls.length; i++) {
    const sourceUrl = opts.imageUrls[i]!;
    const validation = validateImageUrl(sourceUrl);
    if (!validation.valid) {
      await prisma.productImage.create({
        data: {
          productId: opts.productId,
          sourceUrl,
          sortOrder: i,
          status: "SKIPPED",
          metadataJson: JSON.stringify({ reason: validation.reason }),
        },
      });
      failed++;
      continue;
    }

    if (!opts.downloadImages) {
      await prisma.productImage.create({
        data: {
          productId: opts.productId,
          sourceUrl,
          sortOrder: i,
          status: "PENDING",
        },
      });
      created++;
      continue;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const res = await fetch(sourceUrl.startsWith("//") ? `https:${sourceUrl}` : sourceUrl, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = path.extname(new URL(sourceUrl).pathname) || ".jpg";
      const dir = await ensureProductImageDir(opts.productId);
      const fileName = `img-${i + 1}${ext}`;
      const localPath = path.join(dir, fileName);
      await fs.writeFile(localPath, buffer);

      await prisma.productImage.create({
        data: {
          productId: opts.productId,
          sourceUrl,
          localPath,
          publicUrl: `/storage/products/${opts.productId}/${fileName}`,
          sortOrder: i,
          status: "DOWNLOADED",
        },
      });
      created++;
    } catch (e) {
      await prisma.productImage.create({
        data: {
          productId: opts.productId,
          sourceUrl,
          sortOrder: i,
          status: "FAILED",
          metadataJson: JSON.stringify({ error: e instanceof Error ? e.message : "Download failed" }),
        },
      });
      failed++;
    }
  }

  return { created, failed };
}
