/**
 * PAGE_FACTORY_API_DEBUG_AUDIT_V1
 * Run: npx tsx scripts/audit-page-factory-api.ts
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "src/app/api");

const FETCH_PATTERNS = [
  /fetch\(\s*[`'"](\/api\/(?:page-factory|product-universe|internal-sitemap|aeo|admin\/page-factory)[^`'"]*)[`'"]/g,
  /fetch\(\s*`(\/api\/(?:page-factory|product-universe|aeo)[^`$]*)`/g,
  /fetchPageFactoryJson(?:<[^>]*>)?\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
  /fetchPageFactoryJson(?:<[^>]*>)?\(\s*`(\/api\/[^`$]+)`/g,
];

function collectFetchUrls(): string[] {
  const dirs = [
    path.join(ROOT, "src/components/page-factory"),
    path.join(ROOT, "src/components/product-universe"),
    path.join(ROOT, "src/app/admin/page-factory"),
    path.join(ROOT, "src/app/gateway/page-factory"),
    path.join(ROOT, "src/app/dealer/page-factory"),
    path.join(ROOT, "src/app/dealer/product-universe"),
  ];
  const urls = new Set<string>();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const re of FETCH_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(content))) {
          let u = m[1].split("?")[0];
          u = u.replace(/\$\{[^}]+\}/g, "[id]");
          urls.add(u);
        }
      }
    }
  }
  return [...urls].sort();
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function routeFileFor(url: string): string | null {
  const parts = url.replace(/^\/api\//, "").split("/").filter(Boolean);
  let dir = API_ROOT;
  for (const part of parts) {
    const staticChild = path.join(dir, part);
    if (fs.existsSync(staticChild) && fs.statSync(staticChild).isDirectory()) {
      dir = staticChild;
      continue;
    }
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const dynamic = entries.find((e) => e.startsWith("[") && e.endsWith("]"));
    if (dynamic) {
      const dynamicPath = path.join(dir, dynamic);
      if (fs.existsSync(dynamicPath)) {
        dir = dynamicPath;
        continue;
      }
    }
    return null;
  }
  const leaf = path.join(dir, "route.ts");
  return fs.existsSync(leaf) ? leaf : null;
}

function routeMethods(file: string): string[] {
  const content = fs.readFileSync(file, "utf8");
  const methods: string[] = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(content)) methods.push(m);
  }
  return methods;
}

const urls = collectFetchUrls();
const missing: string[] = [];
const found: Array<{ url: string; file: string; methods: string[] }> = [];

for (const url of urls) {
  const file = routeFileFor(url);
  if (!file) {
    missing.push(url);
  } else {
    found.push({ url, file: path.relative(ROOT, file), methods: routeMethods(file) });
  }
}

console.log("\n=== PAGE_FACTORY_API_DEBUG_AUDIT_V1 ===\n");
console.log(`Fetch URLs scanned: ${urls.length}`);
console.log(`Routes found: ${found.length}`);
console.log(`Missing routes: ${missing.length}\n`);

if (missing.length) {
  console.log("--- MISSING (likely HTML 404) ---");
  for (const u of missing) console.log(`  ✗ ${u}`);
}

console.log("\n--- ROUTE MAP ---");
for (const r of found) {
  console.log(`  ✓ ${r.url} → ${r.file} [${r.methods.join(", ") || "?"}]`);
}

process.exit(missing.length ? 1 : 0);
