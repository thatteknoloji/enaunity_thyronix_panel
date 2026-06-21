#!/usr/bin/env node
/**
 * LinkSlash Chrome Extension paketleyici
 * public/linkslash/extension → public/downloads/linkslash/linkslash-extension.zip
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const EXT_DIR = join(ROOT, "public/linkslash/extension");
const OUT_DIR = join(ROOT, "public/downloads/linkslash");
const OUT_ZIP = join(OUT_DIR, "linkslash-extension.zip");
const MANIFEST = join(EXT_DIR, "manifest.json");

const EXCLUDE = [
  "*.DS_Store",
  "node_modules/*",
  "*.map",
  "RELEASE.md",
  "*.md",
];

const LEGACY_ORIGINS = [
  "localhost:3000",
  "localhost:5000",
  "localhost:8000",
  "127.0.0.1:3000",
  "127.0.0.1:5000",
  "127.0.0.1:8000",
];

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

if (!existsSync(EXT_DIR)) fail(`Extension klasörü yok: ${EXT_DIR}`);
if (!existsSync(MANIFEST)) fail(`manifest.json bulunamadı: ${MANIFEST}`);

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  fail("manifest.json geçersiz JSON");
}

const name = String(manifest.name || "");
if (/linkstash/i.test(name)) {
  fail(`manifest.json ürün adı LinkStash içeriyor — LinkSlash olmalı: "${name}"`);
}
if (!/linkslash/i.test(name)) {
  fail(`manifest.json ürün adı LinkSlash içermiyor: "${name}"`);
}

ok(`manifest doğrulandı: ${name} v${manifest.version || "?"}`);

// Eski localhost portları — config ve extension dosyalarında
function scanDir(dir, hits = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      scanDir(full, hits);
    } else if (/\.(js|json|html|ts|tsx)$/i.test(entry.name)) {
      try {
        const text = readFileSync(full, "utf8");
        for (const origin of LEGACY_ORIGINS) {
          if (text.includes(origin)) hits.push({ file: full.replace(EXT_DIR + "/", ""), origin });
        }
      } catch {
        /* ignore */
      }
    }
  }
  return hits;
}
const legacyHits = scanDir(EXT_DIR);
if (legacyHits.length) {
  warn("Eski localhost portları bulundu (production öncesi düzeltin):");
  legacyHits.forEach(({ file, origin }) => warn(`  ${file}: ${origin}`));
} else {
  ok("Eski localhost portları (3000/5000/8000) yok");
}

mkdirSync(OUT_DIR, { recursive: true });

if (existsSync(OUT_ZIP)) {
  try {
    execSync(`rm -f "${OUT_ZIP}"`);
  } catch {
    /* ignore */
  }
}

const excludeArgs = EXCLUDE.map((p) => `-x "${p}"`).join(" ");
try {
  execSync(`cd "${EXT_DIR}" && zip -r "${OUT_ZIP}" . ${excludeArgs}`, { stdio: "inherit" });
} catch {
  fail("zip komutu başarısız — macOS/Linux'ta zip yüklü olmalı");
}

if (!existsSync(OUT_ZIP)) fail("Zip oluşturulamadı");

ok(`Paket hazır: ${OUT_ZIP.replace(ROOT + "/", "")}`);
