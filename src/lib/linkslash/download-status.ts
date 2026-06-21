import { existsSync, readFileSync, statSync } from "fs";
import path from "path";
import { LINKSLASH_BRAND } from "./brand";

export type DownloadFileInfo = {
  available: boolean;
  path: string;
  size: number;
  updatedAt: string | null;
};

export type LinkSlashDownloadStatus = {
  extension: DownloadFileInfo & { buildStatus: "ready" | "missing" | "preparing" };
  android: DownloadFileInfo & { buildStatus: "ready" | "missing" | "pending_verification" };
  mobileWeb: { available: boolean; path: string };
  releaseDocs: { extension: string; android: string };
  admin?: {
    extensionSourceDir: string;
    androidProjectDir: string;
    buildCommands: string[];
    missingFiles: string[];
  };
};

const ROOT = process.cwd();
const DOWNLOADS_DIR = path.join(ROOT, "public/downloads/linkslash");
const EXTENSION_ZIP_FS = path.join(DOWNLOADS_DIR, "linkslash-extension.zip");
const APK_PUBLIC_FS = path.join(DOWNLOADS_DIR, "linkslash-debug.apk");
const APK_BUILD_FS = path.join(ROOT, "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk");
const ANDROID_BUILD_JSON = path.join(DOWNLOADS_DIR, "android-build.json");
const EXTENSION_DIR = path.join(ROOT, "public/linkslash/extension");
const EXTENSION_MANIFEST = path.join(EXTENSION_DIR, "manifest.json");

function fileInfo(publicPath: string, fsPath: string): DownloadFileInfo {
  if (!existsSync(fsPath)) {
    return { available: false, path: publicPath, size: 0, updatedAt: null };
  }
  const stat = statSync(fsPath);
  return {
    available: true,
    path: publicPath,
    size: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

function readAndroidBuildMeta(): { buildStatus?: string; updatedAt?: string } | null {
  if (!existsSync(ANDROID_BUILD_JSON)) return null;
  try {
    return JSON.parse(readFileSync(ANDROID_BUILD_JSON, "utf8")) as { buildStatus?: string; updatedAt?: string };
  } catch {
    return null;
  }
}

function resolveApkInfo(): DownloadFileInfo & { buildStatus: "ready" | "missing" | "pending_verification" } {
  const publicPath = LINKSLASH_BRAND.routes.androidApk;
  const publicInfo = fileInfo(publicPath, APK_PUBLIC_FS);
  if (publicInfo.available) {
    return { ...publicInfo, buildStatus: "ready" };
  }
  const buildInfo = fileInfo(publicPath, APK_BUILD_FS);
  if (buildInfo.available) {
    return { ...buildInfo, path: publicPath, buildStatus: "pending_verification" };
  }
  const meta = readAndroidBuildMeta();
  if (meta?.buildStatus === "missing") {
    return { available: false, path: publicPath, size: 0, updatedAt: meta.updatedAt || null, buildStatus: "missing" };
  }
  return { available: false, path: publicPath, size: 0, updatedAt: null, buildStatus: "missing" };
}

function extensionBuildStatus(): "ready" | "missing" | "preparing" {
  if (existsSync(EXTENSION_ZIP_FS)) return "ready";
  if (existsSync(EXTENSION_MANIFEST)) return "preparing";
  return "missing";
}

export function getLinkSlashDownloadStatus(includeAdmin = false): LinkSlashDownloadStatus {
  const extensionZip = fileInfo(LINKSLASH_BRAND.routes.extensionZip, EXTENSION_ZIP_FS);
  const extStatus = extensionBuildStatus();

  const status: LinkSlashDownloadStatus = {
    extension: {
      ...extensionZip,
      buildStatus: extStatus,
    },
    android: resolveApkInfo(),
    mobileWeb: {
      available: existsSync(path.join(ROOT, "public/linkslash/mobile/index.html")),
      path: LINKSLASH_BRAND.routes.mobileWeb,
    },
    releaseDocs: {
      extension: LINKSLASH_BRAND.routes.extensionRelease,
      android: "/downloads/linkslash/INSTALLATION.md#android-apk-build",
    },
  };

  if (includeAdmin) {
    const missingFiles: string[] = [];
    if (!existsSync(EXTENSION_ZIP_FS)) missingFiles.push("public/downloads/linkslash/linkslash-extension.zip");
    if (!existsSync(APK_PUBLIC_FS)) missingFiles.push("public/downloads/linkslash/linkslash-debug.apk");
    if (!existsSync(EXTENSION_MANIFEST)) missingFiles.push("public/linkslash/extension/manifest.json");

    status.admin = {
      extensionSourceDir: "public/linkslash/extension",
      androidProjectDir: "mobile/linkslash",
      buildCommands: [
        "npm run package:linkslash-extension",
        "npm run verify:linkslash-android",
        "cd mobile/linkslash && npm install && npm run android:build",
        "cd mobile/linkslash/android && ./gradlew assembleDebug",
      ],
      missingFiles,
    };
  }

  return status;
}

export function formatDownloadSize(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
