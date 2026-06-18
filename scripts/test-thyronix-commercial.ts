/**
 * THYRONIX Commercial Readiness — smoke checks for sprint deliverables
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
let passed = 0;
let failed = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail?: string) {
  failed++;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fileHas(path: string, needle: string | RegExp) {
  const full = join(root, path);
  if (!existsSync(full)) return false;
  const content = readFileSync(full, "utf8");
  return typeof needle === "string" ? content.includes(needle) : needle.test(content);
}

console.log("\nTHYRONIX Commercial Readiness Tests\n");

// Pages
for (const p of [
  "src/app/thyronix/getting-started/page.tsx",
  "src/app/thyronix/help/page.tsx",
  "src/app/thyronix/checklist/page.tsx",
  "src/app/thyronix/system-health/page.tsx",
  "src/components/thyronix/OnboardingWizard.tsx",
]) {
  existsSync(join(root, p)) ? ok(`Page/component exists: ${p}`) : fail(`Missing: ${p}`);
}

// APIs
for (const p of [
  "src/app/api/thyronix/feeds/route.ts",
  "src/app/api/thyronix/workspace/route.ts",
  "src/app/api/thyronix/stats/public/route.ts",
]) {
  existsSync(join(root, p)) ? ok(`API exists: ${p}`) : fail(`Missing API: ${p}`);
}

// Feed CRUD wired
fileHas("src/app/thyronix/feeds/feeds-content.tsx", "/api/thyronix/feeds")
  ? ok("Feed center uses thyronix feeds API")
  : fail("Feed center not wired to API");

// Automation
fileHas("src/app/thyronix/automation/page.tsx", "Otomasyon Merkezi") &&
!fileHas("src/app/thyronix/automation/page.tsx", "Yakında")
  ? ok("Automation center implemented")
  : fail("Automation still placeholder");

// Dashboard KPIs
fileHas("src/app/thyronix/page.tsx", "Feed Sağlığı")
  ? ok("Dashboard control center KPIs")
  : fail("Dashboard KPIs missing");

// Multi-user roles
fileHas("src/app/thyronix/users/page.tsx", "OWNER")
  ? ok("Multi-user roles in users page")
  : fail("Multi-user roles missing");

// License aware
fileHas("src/lib/thyronix/commercial.ts", "THYRONIX_PLAN_DEFAULTS")
  ? ok("Plan limits defined")
  : fail("Plan limits missing");

// Demo data removed from login
!fileHas("src/app/thyronix/login/page.tsx", "12847")
  ? ok("Demo counters removed from login")
  : fail("Login still has hardcoded 12847");

fileHas("src/app/thyronix/login/page.tsx", "/api/thyronix/stats/public")
  ? ok("Login uses real stats API")
  : fail("Login stats API not wired");

// Fixed broken nexa reports refs
!fileHas("src/app/thyronix/sources/page.tsx", "/api/nexa/reports")
  ? ok("Sources page API fixed")
  : fail("Sources still uses /api/nexa/reports");

// Onboarding in layout
fileHas("src/app/thyronix/layout.tsx", "OnboardingWizard")
  ? ok("Onboarding wizard mounted in layout")
  : fail("Onboarding wizard not in layout");

// Prisma model
fileHas("prisma/schema.prisma", "ThyronixWorkspaceSettings")
  ? ok("Workspace settings model in schema")
  : fail("Workspace settings model missing");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
