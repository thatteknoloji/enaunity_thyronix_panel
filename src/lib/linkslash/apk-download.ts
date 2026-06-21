import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const PRIVATE_APK = path.join(ROOT, "storage/downloads/linkslash/linkslash-debug.apk");
const BUILD_APK = path.join(ROOT, "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk");
const LEGACY_PUBLIC_APK = path.join(ROOT, "public/downloads/linkslash/linkslash-debug.apk");

export const LINKSLASH_APK_DOWNLOAD_FILENAME = "LinkSlash-Android.apk";
export const LINKSLASH_APK_DOWNLOAD_API = "/api/linkslash/download/android";

/** Sabit APK path — path traversal riski yok */
export function resolveLinkSlashApkPath(): string | null {
  if (existsSync(PRIVATE_APK)) return PRIVATE_APK;
  if (existsSync(BUILD_APK)) return BUILD_APK;
  if (existsSync(LEGACY_PUBLIC_APK)) return LEGACY_PUBLIC_APK;
  return null;
}

export function getLinkSlashApkStat() {
  const fsPath = resolveLinkSlashApkPath();
  if (!fsPath) return null;
  const stat = statSync(fsPath);
  return { fsPath, size: stat.size, updatedAt: stat.mtime.toISOString() };
}

export function createLinkSlashApkReadStream() {
  const fsPath = resolveLinkSlashApkPath();
  if (!fsPath) return null;
  return createReadStream(fsPath);
}
