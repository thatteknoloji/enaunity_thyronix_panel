/**
 * Import marketplace intelligence data from PDF sources.
 * Run: npx tsx scripts/import-marketplace-intelligence.ts
 *
 * PDF parsing is done by scripts/analysis-imports/parse-pdf-sources.py
 * (requires: python3 -m venv .venv-pdf && .venv-pdf/bin/pip install pdfplumber)
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data/marketplace-intelligence");
const PYTHON = join(ROOT, ".venv-pdf/bin/python");
const PARSER = join(ROOT, "scripts/analysis-imports/parse-pdf-sources.py");

type ImportReport = {
  generatedAt: string;
  sources: string[];
  files: Array<{ file: string; records: number }>;
  skipped: string[];
  verification: Record<string, string | number | boolean>;
};

function countRecords(path: string): number {
  const data = JSON.parse(readFileSync(path, "utf-8"));
  return data.entries?.length ?? data.brackets?.length ?? 0;
}

function main() {
  console.log("Importing marketplace intelligence from PDF sources...\n");

  if (!existsSync(PYTHON)) {
    console.error("Python venv not found. Run:");
    console.error("  python3 -m venv .venv-pdf && .venv-pdf/bin/pip install pdfplumber");
    process.exit(1);
  }

  execSync(`"${PYTHON}" "${PARSER}"`, { stdio: "inherit", cwd: ROOT });

  const files = [
    "trendyol-shipping-2026-05-22.json",
    "hepsiburada-shipping-2026-01-02.json",
    "ciceksepeti-shipping-2026.json",
    "trendyol-commissions-2026.json",
    "hepsiburada-commissions-2026.json",
    "n11-commissions-2026.json",
    "n11-shipping-2026.json",
  ];

  const report: ImportReport = {
    generatedAt: new Date().toISOString(),
    sources: [
      "Trendyol_Komisyon_Oranlar_.pdf",
      "trendyol.pdf",
      "Hepsibu_Komisyon_Listesi.pdf",
      "hepsiburada.pdf",
      "c_ic_ek.pdf",
      "N11 komisyon metni (manual)",
      "N11 özel kargo kampanyası (manual)",
    ],
    files: files.map((file) => ({
      file,
      records: countRecords(join(OUT, file)),
    })),
    skipped: ["ÇiçekSepeti komisyon PDF kaynağı yok"],
    verification: {},
  };

  const ty = JSON.parse(readFileSync(join(OUT, "trendyol-shipping-2026-05-22.json"), "utf-8"));
  const ty90 = ty.brackets.find((b: { carrier: string; desiMin: number }) => b.carrier === "yurtici" && b.desiMin === 90);
  report.verification.trendyolYurtici90 = ty90?.price;

  const cs = JSON.parse(readFileSync(join(OUT, "ciceksepeti-shipping-2026.json"), "utf-8"));
  report.verification.ciceksepetiYurtici10 = cs.brackets.find((b: { carrier: string; desiMin: number }) => b.carrier === "yurtici" && b.desiMin === 10)?.price;
  report.verification.ciceksepetiYurtici90 = cs.brackets.find((b: { carrier: string; desiMin: number }) => b.carrier === "yurtici" && b.desiMin === 90)?.price;

  const n11 = JSON.parse(readFileSync(join(OUT, "n11-shipping-2026.json"), "utf-8"));
  report.verification.n11Yurtici10 = n11.brackets.find((b: { desiMin: number }) => b.desiMin === 10)?.price;

  const hb = JSON.parse(readFileSync(join(OUT, "hepsiburada-commissions-2026.json"), "utf-8"));
  const hali = hb.entries.find((e: { subCategory: string }) => e.subCategory === "Halı & Kilim");
  report.verification.hepsiburadaHaliRate = hali?.ratePercent;
  report.verification.ciceksepetiCommissionAvailable = false;

  const reportPath = join(OUT, "import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nImport report: ${reportPath}`);
  console.log(JSON.stringify(report.verification, null, 2));
}

main();
