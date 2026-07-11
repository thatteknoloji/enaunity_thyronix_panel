/**
 * Kritik canlı kurtarma wrapper'ı
 *
 * Kapsam:
 * - EsnekPOS + ödeme yöntemlerini aç
 * - Esra / Bezos kaynağını geri kur
 * - VHT feed tanımlarını geri kur
 * - İstenirse VHT feed'leri anında sync et
 * - İstenirse EsnekPOS API testini çalıştır
 */
import { spawnSync } from "node:child_process";

type Step = {
  label: string;
  cmd: string[];
  enabled: boolean;
};

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`
Kullanim:
  npx tsx scripts/recover-critical-state.ts [secenekler]

Secenekler:
  --all
  --payments
  --thyronix
  --sync-feeds
  --test-esnekpos
  --dry-run
  --help, -h
`);
  process.exit(0);
}

const dryRun = args.has("--dry-run");
const all = args.has("--all");
const wantsPayments = all || args.has("--payments");
const wantsThyronix = all || args.has("--thyronix");
const wantsFeedSync = args.has("--sync-feeds");
const wantsEsnekposTest = args.has("--test-esnekpos");

const steps: Step[] = [
  {
    label: "EsnekPOS credential + odeme yontemleri",
    cmd: ["npx", "tsx", "scripts/configure-esnekpos-and-open-payments.ts"],
    enabled: wantsPayments,
  },
  {
    label: "Tum odeme yontemlerini acik tut",
    cmd: ["npx", "tsx", "scripts/ensure-all-payments-open.ts"],
    enabled: wantsPayments,
  },
  {
    label: "Esra Bezos kaynagini geri kur",
    cmd: ["npx", "tsx", "scripts/seed-esra-bezos-source.ts"],
    enabled: wantsThyronix,
  },
  {
    label: "VHT feed tanimlarini geri kur",
    cmd: ["npx", "tsx", "scripts/seed-vht-supplier-feeds.ts", ...(wantsFeedSync ? ["--sync"] : [])],
    enabled: wantsThyronix,
  },
  {
    label: "EsnekPOS canli API testi",
    cmd: ["npx", "tsx", "scripts/test-esnekpos-live.ts"],
    enabled: wantsPayments && wantsEsnekposTest,
  },
];

const active = steps.filter((s) => s.enabled);

if (active.length === 0) {
  console.error("Calisacak adim secilmedi. En az birini ver: --payments, --thyronix veya --all");
  process.exit(1);
}

console.log("=== Critical Recovery Runner ===");
console.log(`Dry run: ${dryRun ? "evet" : "hayir"}`);
console.log("");

for (const step of active) {
  console.log(`→ ${step.label}`);
  console.log(`  $ ${step.cmd.join(" ")}`);
  if (dryRun) {
    console.log("");
    continue;
  }

  const res = spawnSync(step.cmd[0]!, step.cmd.slice(1), {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (res.status !== 0) {
    console.error(`\n✗ Adim basarisiz: ${step.label}`);
    process.exit(res.status || 1);
  }

  console.log(`✓ Tamam: ${step.label}\n`);
}

console.log("=== Critical Recovery Runner Tamamlandi ===");
