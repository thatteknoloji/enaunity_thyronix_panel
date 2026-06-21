import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { LINKSLASH_BRAND } from "./brand";
import { LINKSLASH_APK_DOWNLOAD_API } from "./apk-download";

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
const PRIVATE_APK_DIR = path.join(ROOT, "storage/downloads/linkslash");
const EXTENSION_ZIP_FS = path.join(DOWNLOADS_DIR, "linkslash-extension.zip");
const APK_PRIVATE_FS = path.join(PRIVATE_APK_DIR, "linkslash-debug.apk");
const APK_BUILD_FS = path.join(ROOT, "mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk");
const APK_LEGACY_PUBLIC_FS = path.join(DOWNLOADS_DIR, "linkslash-debug.apk");
const ANDROID_BUILD_JSON = path.join(DOWNLOADS_DIR, "android-build.json");
const EXTENSION_RELEASE_FS = path.join(ROOT, "public/linkslash/extension/RELEASE.md");
const ANDROID_RELEASE_FS = path.join(ROOT, "mobile/linkslash/RELEASE.md");
const ANDROID_RELEASE_PUBLIC = path.join(DOWNLOADS_DIR, "android/RELEASE.md");

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

function resolveApkInfoSync(): DownloadFileInfo & { buildStatus: "ready" | "missing" | "pending_verification" } {
  const apiPath = LINKSLASH_APK_DOWNLOAD_API;
  if (existsSync(APK_PRIVATE_FS)) {
    const stat = statSync(APK_PRIVATE_FS);
    return { available: true, path: apiPath, size: stat.size, updatedAt: stat.mtime.toISOString(), buildStatus: "ready" };
  }
  const versioned = existsSync(PRIVATE_APK_DIR)
    ? readdirSync(PRIVATE_APK_DIR).filter((f) => /^linkslash-v[\d.]+\.apk$/i.test(f))
    : [];
  if (versioned.length) {
    const fsPath = path.join(PRIVATE_APK_DIR, versioned[0]);
    const stat = statSync(fsPath);
    return { available: true, path: apiPath, size: stat.size, updatedAt: stat.mtime.toISOString(), buildStatus: "ready" };
  }
  if (existsSync(APK_BUILD_FS)) {
    const stat = statSync(APK_BUILD_FS);
    return {
      available: true,
      path: apiPath,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      buildStatus: "pending_verification",
    };
  }
  const meta = readAndroidBuildMeta();
  if (meta?.buildStatus === "missing") {
    return { available: false, path: apiPath, size: 0, updatedAt: meta.updatedAt || null, buildStatus: "missing" };
  }
  return { available: false, path: apiPath, size: 0, updatedAt: null, buildStatus: "missing" };
}

function extensionBuildStatus(): "ready" | "missing" | "preparing" {
  if (existsSync(EXTENSION_ZIP_FS)) return "ready";
  if (existsSync(path.join(ROOT, "public/linkslash/extension/manifest.json"))) return "preparing";
  return "missing";
}

function resolveReleaseDocs(): { extension: string; android: string } {
  const extension = existsSync(EXTENSION_RELEASE_FS) ? "/linkslash/extension/RELEASE.md" : "";
  const android = existsSync(ANDROID_RELEASE_PUBLIC)
    ? "/downloads/linkslash/android/RELEASE.md"
    : existsSync(ANDROID_RELEASE_FS)
      ? "/downloads/linkslash/INSTALLATION.md"
      : "";
  return { extension, android };
}

export function getLinkSlashDownloadStatus(includeAdmin = false): LinkSlashDownloadStatus {
  const extensionZip = fileInfo(LINKSLASH_BRAND.routes.extensionZip, EXTENSION_ZIP_FS);
  const extStatus = extensionBuildStatus();

  const status: LinkSlashDownloadStatus = {
    extension: {
      ...extensionZip,
      buildStatus: extStatus,
    },
    android: resolveApkInfoSync(),
    mobileWeb: {
      available: existsSync(path.join(ROOT, "public/linkslash/mobile/index.html")),
      path: LINKSLASH_BRAND.routes.mobileWeb,
    },
    releaseDocs: resolveReleaseDocs(),
  };

  if (includeAdmin) {
    const missingFiles: string[] = [];
    if (!existsSync(EXTENSION_ZIP_FS)) missingFiles.push("public/downloads/linkslash/linkslash-extension.zip");
    if (!existsSync(APK_PRIVATE_FS) && !existsSync(APK_BUILD_FS)) missingFiles.push("storage/downloads/linkslash/*.apk");
    if (!existsSync(path.join(ROOT, "public/linkslash/extension/manifest.json"))) {
      missingFiles.push("public/linkslash/extension/manifest.json");
    }

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

export { formatDownloadSize } from "./format";
