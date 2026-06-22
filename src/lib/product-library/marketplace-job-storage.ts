import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ROOT_DIR = path.join(process.cwd(), "storage", "product-library", "marketplace-jobs");

export function absoluteMarketplaceJobPath(relativePath: string) {
  return path.join(ROOT_DIR, relativePath);
}

export async function saveMarketplaceJobFile(params: {
  dealerId: string;
  jobId: string;
  fileName: string;
  body: Buffer | string;
}) {
  const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "-") || `${params.jobId}.dat`;
  const relativePath = path.join(params.dealerId, params.jobId, safeFileName);
  const absolutePath = absoluteMarketplaceJobPath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = typeof params.body === "string" ? Buffer.from(params.body, "utf8") : Buffer.from(params.body);
  await fs.writeFile(absolutePath, buffer);

  return {
    filePath: relativePath,
    fileName: safeFileName,
    fileSize: buffer.byteLength,
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function readMarketplaceJobFile(relativePath: string) {
  return fs.readFile(absoluteMarketplaceJobPath(relativePath));
}
