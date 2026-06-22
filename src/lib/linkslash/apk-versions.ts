import { existsSync, statSync } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

const STORAGE_DIR = path.join(process.cwd(), "storage/downloads/linkslash");
export const LINKSLASH_MOBILE_APP_VERSION = process.env.LINKSLASH_APP_VERSION || "1.1.0";

export type VersionInfo = {
  latest: string;
  required: string;
  buildNumber: number;
  apkUrl: string;
  tokenUrl: string;
  updateAvailable: boolean;
  updateRequired: boolean;
};

export function getApkStoragePath(fileName: string): string {
  const safe = path.basename(fileName);
  if (!/^linkslash-v[\d.]+\.apk$/i.test(safe) && safe !== "linkslash-debug.apk") {
    throw new Error("Geçersiz APK dosya adı");
  }
  return path.join(STORAGE_DIR, safe);
}

export async function getActiveApkRelease() {
  return prisma.linkSlashApkRelease.findFirst({ where: { active: true }, orderBy: { uploadedAt: "desc" } });
}

export async function listApkReleases() {
  return prisma.linkSlashApkRelease.findMany({ orderBy: { uploadedAt: "desc" } });
}

export async function setActiveApkRelease(id: string, requiredVersion?: string) {
  await prisma.linkSlashApkRelease.updateMany({ data: { active: false } });
  return prisma.linkSlashApkRelease.update({
    where: { id },
    data: { active: true, ...(requiredVersion !== undefined ? { requiredVersion } : {}) },
  });
}

export async function deleteApkRelease(id: string) {
  const row = await prisma.linkSlashApkRelease.findUnique({ where: { id } });
  if (!row) throw new Error("Sürüm bulunamadı");
  if (row.active) throw new Error("Aktif sürüm silinemez — önce başka sürümü aktif yapın");
  return prisma.linkSlashApkRelease.delete({ where: { id } });
}

export function resolveApkFileForRelease(release: { fileName: string } | null): string | null {
  if (release) {
    const p = getApkStoragePath(release.fileName);
    if (existsSync(p)) return p;
  }
  const legacy = path.join(STORAGE_DIR, "linkslash-debug.apk");
  if (existsSync(legacy)) return legacy;
  return null;
}

export async function getVersionInfo(currentVersion?: string): Promise<VersionInfo> {
  const active = await getActiveApkRelease();
  const latest = active?.version || LINKSLASH_MOBILE_APP_VERSION;
  const required = active?.requiredVersion || latest;
  const buildNumber = active?.buildNumber || 1;

  const cv = currentVersion || "0.0.0";
  const updateAvailable = compareVersions(cv, latest) < 0;
  const updateRequired = compareVersions(cv, required) < 0;

  return {
    latest,
    required,
    buildNumber,
    apkUrl: "/api/linkslash/download/android",
    tokenUrl: "/api/linkslash/download/token",
    updateAvailable,
    updateRequired,
  };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export function statApkFile(fsPath: string) {
  const stat = statSync(fsPath);
  return { size: stat.size, updatedAt: stat.mtime.toISOString() };
}
