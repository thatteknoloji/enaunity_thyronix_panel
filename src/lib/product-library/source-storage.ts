import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const STORAGE_DIR = path.join(ROOT, "storage", "product-library", "packages");

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "source";
}

export function relativeSourcePath(absolutePath: string) {
  return path.relative(ROOT, absolutePath);
}

export function absoluteSourcePath(relativePath: string) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

export async function savePackageSourceFile(params: {
  packageId: string;
  versionNo: number;
  fileName: string;
  buffer: Buffer;
}) {
  const dir = path.join(STORAGE_DIR, params.packageId);
  await mkdir(dir, { recursive: true });
  const prefix = `${String(params.versionNo).padStart(3, "0")}-${Date.now()}`;
  const absolutePath = path.join(dir, `${prefix}-${safeFileName(params.fileName)}`);
  await writeFile(absolutePath, params.buffer);
  return {
    absolutePath,
    relativePath: relativeSourcePath(absolutePath),
    fileHash: crypto.createHash("sha256").update(params.buffer).digest("hex"),
  };
}

export async function readPackageSourceFile(relativePath: string) {
  return readFile(absoluteSourcePath(relativePath));
}
