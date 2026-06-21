import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import {
  getApkStoragePath,
  LINKSLASH_MOBILE_APP_VERSION,
  statApkFile,
} from "./apk-versions";

const ROOT = process.cwd();
const STORAGE_DIR = path.join(ROOT, "storage/downloads/linkslash");
const BUILD_APK = path.join(ROOT, "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk");
const PRIVATE_DEBUG = path.join(STORAGE_DIR, "linkslash-debug.apk");
const LEGACY_PUBLIC = path.join(ROOT, "public/downloads/linkslash/linkslash-debug.apk");

export type ApkSyncResult = {
  ok: boolean;
  source?: string;
  fileName?: string;
  size?: number;
  version?: string;
  releaseId?: string;
  message: string;
};

/** Gradle build veya mevcut APK dosyasını storage'a kopyalar ve DB kaydı oluşturur */
export async function syncApkFromBuild(options?: {
  version?: string;
  buildNumber?: number;
  setActive?: boolean;
}): Promise<ApkSyncResult> {
  const version = options?.version?.trim() || LINKSLASH_MOBILE_APP_VERSION;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { ok: false, message: "Geçersiz sürüm formatı (x.y.z gerekli)" };
  }

  let source: string | null = null;
  if (existsSync(BUILD_APK)) source = BUILD_APK;
  else if (existsSync(PRIVATE_DEBUG)) source = PRIVATE_DEBUG;
  else if (existsSync(LEGACY_PUBLIC)) source = LEGACY_PUBLIC;

  if (!source) {
    return {
      ok: false,
      message:
        "APK bulunamadı. Önce: cd mobile/linkslash && npm run android:build && cd android && ./gradlew assembleDebug",
    };
  }

  mkdirSync(STORAGE_DIR, { recursive: true });
  const fileName = `linkslash-v${version}.apk`;
  const target = getApkStoragePath(fileName);
  copyFileSync(source, target);
  copyFileSync(source, PRIVATE_DEBUG);

  const stat = statApkFile(target);
  const buildNumber = options?.buildNumber ?? 1;
  const setActive = options?.setActive !== false;

  if (setActive) {
    await prisma.linkSlashApkRelease.updateMany({ data: { active: false } });
  }

  const release = await prisma.linkSlashApkRelease.upsert({
    where: { version },
    create: {
      version,
      buildNumber,
      requiredVersion: version,
      fileName,
      fileSize: stat.size,
      active: setActive,
      uploadedBy: "sync-from-build",
    },
    update: {
      buildNumber,
      requiredVersion: version,
      fileName,
      fileSize: stat.size,
      active: setActive ? true : undefined,
      uploadedBy: "sync-from-build",
      uploadedAt: new Date(),
    },
  });

  return {
    ok: true,
    source: source.replace(ROOT + path.sep, ""),
    fileName,
    size: stat.size,
    version,
    releaseId: release.id,
    message: `APK senkronize edildi (${(stat.size / 1024 / 1024).toFixed(2)} MB)`,
  };
}

export function getApkSourceHints() {
  return {
    buildApk: existsSync(BUILD_APK),
    privateDebug: existsSync(PRIVATE_DEBUG),
    legacyPublic: existsSync(LEGACY_PUBLIC),
    buildPath: "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk",
    storagePath: "storage/downloads/linkslash/",
  };
}
