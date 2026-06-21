#!/usr/bin/env node
/**
 * LinkSlash Play Store hazırlık — AAB pipeline, asset sync, signing şablonu
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MOBILE = join(ROOT, "mobile/linkslash");
const ANDROID = join(MOBILE, "android");
const PLAY_STORE = join(MOBILE, "play-store");
const KEYSTORE_EXAMPLE = join(MOBILE, "keystore.properties.example");
const ICON_SRC = join(ROOT, "public/linkslash/icon512.png");
const ICON_DST = join(PLAY_STORE, "icon-512.png");

function ok(msg) { console.log(`✓ ${msg}`); }
function warn(msg) { console.warn(`⚠ ${msg}`); }

console.log("=== LinkSlash Play Store Preparation ===\n");

mkdirSync(PLAY_STORE, { recursive: true });
mkdirSync(join(PLAY_STORE, "screenshots"), { recursive: true });

if (existsSync(ICON_SRC)) {
  copyFileSync(ICON_SRC, ICON_DST);
  ok("icon-512.png kopyalandı");
} else {
  warn("public/linkslash/icon512.png bulunamadı");
}

if (!existsSync(ANDROID)) {
  warn("android/ klasörü yok — önce: npm run mobile:linkslash:setup");
} else {
  ok("android/ projesi mevcut");
}

if (!existsSync(KEYSTORE_EXAMPLE)) {
  const example = `# LinkSlash release signing — android/keystore.properties olarak kopyalayın (gitignore'da)
storeFile=../linkslash-release.keystore
storePassword=CHANGE_ME
keyAlias=linkslash
keyPassword=CHANGE_ME
`;
  writeFileSync(KEYSTORE_EXAMPLE, example);
  ok("keystore.properties.example oluşturuldu (mobile/linkslash/)");
} else {
  ok("keystore.properties.example mevcut");
}

const releaseGradleSnippet = `
// LinkSlash release signing (keystore.properties varsa)
def keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    def keystoreProps = new Properties()
    keystoreProps.load(new FileInputStream(keystorePropsFile))
    android {
        signingConfigs {
            release {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.release
                minifyEnabled false
            }
        }
    }
}
`;

const gradleNotePath = join(MOBILE, "GRADLE_SIGNING.md");
writeFileSync(
  gradleNotePath,
  `# Gradle Release Signing\n\n\`android/app/build.gradle\` dosyasının sonuna aşağıdaki snippet'i ekleyin:\n\n\`\`\`gradle\n${releaseGradleSnippet.trim()}\n\`\`\`\n\nSonra:\n\`\`\`bash\ncd android && ./gradlew bundleRelease\n\`\`\`\n\nÇıktı: \`app/build/outputs/bundle/release/app-release.aab\`\n`
);
ok("GRADLE_SIGNING.md oluşturuldu");

try {
  execSync("node scripts/verify-linkslash-android.mjs", { cwd: ROOT, stdio: "inherit" });
} catch {
  warn("verify-linkslash-android uyarı ile tamamlandı");
}

console.log("\nSonraki adımlar:");
console.log("  1. npm run mobile:linkslash:setup");
console.log("  2. Keystore oluştur + keystore.properties");
console.log("  3. cd mobile/linkslash/android && ./gradlew bundleRelease");
console.log("  4. docs/linkslash/PLAY_STORE.md checklist");
