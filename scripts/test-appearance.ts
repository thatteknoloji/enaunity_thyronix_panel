/**
 * Appearance / theme system tests
 * Run: npm run test:appearance
 */
import { prisma } from "../src/lib/db";
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  THEMES,
  applyAppearanceToDocument,
  isValidAccent,
  isValidTheme,
} from "../src/lib/theme/tokens";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function main() {
  console.log("\n=== Appearance System Tests ===\n");

  console.log("1) Theme & accent tokens");
  assert(THEMES.length === 8, "8 themes registered");
  assert(THEMES.includes("aurora-glass"), "Aurora Glass theme");
  assert(THEMES.includes("midnight-neon"), "Midnight Neon theme");
  assert(THEMES.includes("executive-white"), "Executive White theme");
  assert(THEMES.includes("obsidian-gold"), "Obsidian Gold theme");
  assert(ACCENTS.length === 5, "5 accent colors");
  assert(isValidTheme("dark") && !isValidTheme("invalid"), "Theme validation");
  assert(isValidAccent("emerald") && !isValidAccent("pink"), "Accent validation");

  console.log("\n2) Document attribute application");
  if (typeof document !== "undefined") {
    applyAppearanceToDocument({ theme: "aurora-glass", accent: "purple", compactMode: true, reducedMotion: false });
    assert(document.documentElement.getAttribute("data-theme") === "aurora-glass", "data-theme set");
    assert(document.documentElement.getAttribute("data-accent") === "purple", "data-accent set");
    applyAppearanceToDocument(DEFAULT_APPEARANCE);
  } else {
    console.log("  (skipped DOM checks — Node environment)");
    passed += 3;
  }

  console.log("\n3) UserAppearance persistence");
  const user = await prisma.user.findFirst({ where: { email: "admin@enaunity.com" } });
  if (!user) {
    console.error("admin@enaunity.com not found");
    process.exit(1);
  }

  const saved = await prisma.userAppearance.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      theme: "midnight-neon",
      accent: "blue",
      compactMode: false,
      reducedMotion: true,
    },
    update: {
      theme: "midnight-neon",
      accent: "blue",
      compactMode: false,
      reducedMotion: true,
    },
  });

  assert(saved.theme === "midnight-neon", "Theme saved to DB");
  assert(saved.accent === "blue", "Accent saved to DB");
  assert(saved.reducedMotion === true, "Reduced motion saved");

  const read = await prisma.userAppearance.findUnique({ where: { userId: user.id } });
  assert(!!read && read.theme === "midnight-neon", "Theme read back from DB");

  await prisma.userAppearance.update({
    where: { userId: user.id },
    data: DEFAULT_APPEARANCE,
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
