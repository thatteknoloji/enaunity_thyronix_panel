import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { getActiveApkRelease, resolveApkFileForRelease } from "./apk-versions";

const ROOT = process.cwd();
const BUILD_APK = path.join(ROOT, "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk");
const LEGACY_PUBLIC_APK = path.join(ROOT, "public/downloads/linkslash/linkslash-debug.apk");

export const LINKSLASH_APK_DOWNLOAD_FILENAME = "LinkSlash-Android.apk";
export const LINKSLASH_APK_DOWNLOAD_API = "/api/linkslash/download/android";
export const LINKSLASH_APK_TOKEN_API = "/api/linkslash/download/token";

/** Sabit APK path — path traversal riski yok */
export async function resolveLinkSlashApkPath(releaseId?: string): Promise<string | null> {
  if (releaseId) {
    const { prisma } = await import("@/lib/db");
    const release = await prisma.linkSlashApkRelease.findUnique({ where: { id: releaseId } });
    if (release) {
      const p = resolveApkFileForRelease(release);
      if (p) return p;
    }
  }
  const active = await getActiveApkRelease();
  const fromRelease = resolveApkFileForRelease(active);
  if (fromRelease) return fromRelease;
  if (existsSync(BUILD_APK)) return BUILD_APK;
  if (existsSync(LEGACY_PUBLIC_APK)) return LEGACY_PUBLIC_APK;
  return null;
}

export async function getLinkSlashApkStat(releaseId?: string) {
  const fsPath = await resolveLinkSlashApkPath(releaseId);
  if (!fsPath) return null;
  const stat = statSync(fsPath);
  return { fsPath, size: stat.size, updatedAt: stat.mtime.toISOString() };
}

export async function createLinkSlashApkReadStream(releaseId?: string) {
  const fsPath = await resolveLinkSlashApkPath(releaseId);
  if (!fsPath) return null;
  return createReadStream(fsPath);
}
