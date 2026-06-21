/**
 * Gradle/build APK varsa storage'a kopyalar ve DB kaydı oluşturur.
 * Run: npx tsx scripts/ensure-linkslash-apk.ts
 */
import { syncApkFromBuild, getApkSourceHints } from "../src/lib/linkslash/apk-sync";

async function main() {
  const hints = getApkSourceHints();
  console.log("APK kaynak durumu:", hints);

  const result = await syncApkFromBuild({ setActive: true });
  if (result.ok) {
    console.log("✓", result.message);
    if (result.source) console.log("  kaynak:", result.source);
    return;
  }

  console.log("⚠", result.message);
  if (!hints.buildApk && !hints.privateDebug && !hints.legacyPublic) {
    console.log("\nAndroid APK henüz yok. Üretmek için:");
    console.log("  cd mobile/linkslash && npm install && npm run android:build");
    console.log("  cd android && ./gradlew assembleDebug");
    console.log("  npm run verify:linkslash-android");
    console.log("  npx tsx scripts/ensure-linkslash-apk.ts");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
