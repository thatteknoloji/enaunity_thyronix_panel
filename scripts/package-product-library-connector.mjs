#!/usr/bin/env node
/**
 * ENA Marketplace Connector paketleyici
 * public/product-library/connector → private/product-library/ena-marketplace-connector.zip
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const EXT_DIR = join(ROOT, "public/product-library/connector");
const OUT_DIR = join(ROOT, "private/product-library");
const OUT_ZIP = join(OUT_DIR, "ena-marketplace-connector.zip");
const MANIFEST = join(EXT_DIR, "manifest.json");

const EXCLUDE = [
  "*.DS_Store",
  "*.map",
  "*.md"
];

function fail(message) {
  console.error("✗ " + message);
  process.exit(1);
}

function ok(message) {
  console.log("✓ " + message);
}

if (!existsSync(EXT_DIR)) fail("Connector klasoru yok: " + EXT_DIR);
if (!existsSync(MANIFEST)) fail("manifest.json bulunamadi");

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  fail("manifest.json gecersiz");
}

if (!/ENA Marketplace Connector/i.test(String(manifest.name || ""))) {
  fail("manifest name ENA Marketplace Connector olmali");
}

mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(OUT_ZIP)) {
  execSync(`rm -f "${OUT_ZIP}"`);
}

const excludeArgs = EXCLUDE.map((pattern) => `-x "${pattern}"`).join(" ");
try {
  execSync(`cd "${EXT_DIR}" && zip -r "${OUT_ZIP}" . ${excludeArgs}`, { stdio: "inherit" });
} catch {
  fail("zip komutu basarisiz");
}

ok(`Paket hazir: ${OUT_ZIP.replace(ROOT + "/", "")}`);
