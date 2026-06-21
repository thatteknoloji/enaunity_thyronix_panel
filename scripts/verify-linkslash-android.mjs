#!/usr/bin/env node
/**
 * LinkSlash Android APK doğrulama ve kopyalama
 * Build kırmaz — status: missing ile çıkar
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MOBILE = join(ROOT, "mobile/linkslash");
const CAP_CONFIG = join(MOBILE, "capacitor.config.ts");
const ANDROID_DIR = join(MOBILE, "android");
const SHARE_SNIPPET = join(MOBILE, "native/android/AndroidManifest.share.xml");
const MAIN_ACTIVITY = join(MOBILE, "native/android/MainActivity.java");
const SHARE_PLUGIN = join(MOBILE, "native/android/ShareReceiverPlugin.java");
const BUILD_APK = join(ANDROID_DIR, "app/build/outputs/apk/debug/app-debug.apk");
const PRIVATE_DIR = join(ROOT, "storage/downloads/linkslash");
const PRIVATE_APK = join(PRIVATE_DIR, "linkslash-debug.apk");
const LEGACY_PUBLIC_APK = join(ROOT, "public/downloads/linkslash/linkslash-debug.apk");
const PUBLIC_META_DIR = join(ROOT, "public/downloads/linkslash");
const ANDROID_RELEASE_SRC = join(MOBILE, "RELEASE.md");
const ANDROID_RELEASE_PUBLIC = join(PUBLIC_META_DIR, "android/RELEASE.md");
const META_JSON = join(PUBLIC_META_DIR, "android-build.json");

function ok(msg) {
  console.log(`✓ ${msg}`);
}

const checks = {
  mobileDir: existsSync(MOBILE),
  capacitorConfig: existsSync(CAP_CONFIG),
  mainActivity: existsSync(MAIN_ACTIVITY),
  sharePlugin: existsSync(SHARE_PLUGIN),
  shareIntentSnippet: existsSync(SHARE_SNIPPET),
  androidGenerated: existsSync(ANDROID_DIR),
  buildApk: existsSync(BUILD_APK),
  privateApk: existsSync(PRIVATE_APK),
};

let shareIntentOk = false;
if (checks.shareIntentSnippet) {
  const snippet = readFileSync(SHARE_SNIPPET, "utf8");
  shareIntentOk = snippet.includes("android.intent.action.SEND");
}
checks.shareIntentInSnippet = shareIntentOk;

let appNameOk = false;
if (checks.capacitorConfig) {
  const cfg = readFileSync(CAP_CONFIG, "utf8");
  appNameOk = /appName:\s*["']LinkSlash["']/.test(cfg) && !/LinkStash/i.test(cfg);
}
checks.productNameLinkSlash = appNameOk;

mkdirSync(PRIVATE_DIR, { recursive: true });
mkdirSync(PUBLIC_META_DIR, { recursive: true });
mkdirSync(join(PUBLIC_META_DIR, "android"), { recursive: true });

if (existsSync(ANDROID_RELEASE_SRC)) {
  try {
    copyFileSync(ANDROID_RELEASE_SRC, ANDROID_RELEASE_PUBLIC);
    ok("Android RELEASE.md → public/downloads/linkslash/android/RELEASE.md");
  } catch (e) {
    console.warn("⚠ Android RELEASE kopyalanamadı:", e.message);
  }
}

let apkSource = null;
if (checks.buildApk) apkSource = BUILD_APK;
else if (checks.privateApk) apkSource = PRIVATE_APK;
else if (existsSync(LEGACY_PUBLIC_APK)) apkSource = LEGACY_PUBLIC_APK;

let copied = false;
if (apkSource && apkSource !== PRIVATE_APK) {
  try {
    copyFileSync(apkSource, PRIVATE_APK);
    copied = true;
    checks.privateApk = true;
  } catch (e) {
    console.warn("⚠ APK kopyalanamadı:", e.message);
  }
}

if (existsSync(LEGACY_PUBLIC_APK)) {
  try {
    unlinkSync(LEGACY_PUBLIC_APK);
    ok("Eski public APK kaldırıldı (lisanslı API indirme zorunlu)");
  } catch (_) {}
}

const available = existsSync(PRIVATE_APK);
const stat = available ? statSync(PRIVATE_APK) : null;

const meta = {
  status: available ? "ready" : "missing",
  buildStatus: available ? "ready" : "missing",
  productName: "LinkSlash",
  updatedAt: new Date().toISOString(),
  downloadApi: "/api/linkslash/download/android",
  privatePath: "storage/downloads/linkslash/linkslash-debug.apk",
  sourcePath: apkSource ? apkSource.replace(ROOT + "/", "") : null,
  copied,
  size: stat?.size ?? 0,
  apkUpdatedAt: stat?.mtime?.toISOString() ?? null,
  checks,
  commands: [
    "cd mobile/linkslash",
    "npm install",
    "npm run android:build",
    "cd android && ./gradlew assembleDebug",
    "npm run verify:linkslash-android",
  ],
};

writeFileSync(META_JSON, JSON.stringify(meta, null, 2));

console.log("=== LinkSlash Android Verification ===");
Object.entries(checks).forEach(([k, v]) => console.log(`${v ? "✓" : "✗"} ${k}`));

if (available) {
  console.log(`✓ APK hazır: storage/downloads/linkslash/linkslash-debug.apk (${meta.size} bytes)`);
  process.exit(0);
}

console.log("\n⚠ APK henüz üretilmedi (status: missing)");
console.log("Yapılacak komutlar:");
meta.commands.forEach((c) => console.log(`  ${c}`));
process.exit(0);
