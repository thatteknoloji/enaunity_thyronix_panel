/**
 * EMA bayi listesi toplu import
 * Run: npx tsx scripts/import-emabayi-dealers.ts --file /path/emabayi1.xlsx
 * Dry-run: npx tsx scripts/import-emabayi-dealers.ts --file /path/emabayi1.xlsx --dry-run
 */
import { readFileSync, existsSync } from "fs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const DEMO_EMAILS = new Set(["demo@demo.com", "demoenaunity@gmail.com"]);
const DEFAULT_PASSWORD = "123456";
const DEFAULT_GROUP = "bronze";

type Row = {
  ID?: number;
  ADI?: string;
  SOYADI?: string;
  EMAIL?: string;
  ADRES?: string;
  İL?: string;
  İLCE?: string;
  EVTEL?: string;
  ISTEL?: string;
  CEPTEL?: string;
  TCKNO?: string;
  VERGINO?: string;
  VERGIDAIRESI?: string;
};

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function pickPhone(row: Row): string {
  return str(row.CEPTEL) || str(row.EVTEL) || str(row.ISTEL) || "-";
}

function buildLocation(row: Row): string {
  const parts = [str(row.İL), str(row.İLCE)].filter(Boolean);
  return parts.join(" / ");
}

function isDemoEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (DEMO_EMAILS.has(lower)) return true;
  const local = lower.split("@")[0] ?? "";
  return local === "demo" || local.startsWith("demo");
}

async function ensureBronzeGroup() {
  await prisma.dealerGroup.upsert({
    where: { name: DEFAULT_GROUP },
    update: {},
    create: {
      name: DEFAULT_GROUP,
      discountRate: 0,
      creditLimit: 0,
      allowNegativeBalance: false,
      minOrderAmount: 0,
      paymentDays: 0,
    },
  });
}

async function importRow(row: Row, dryRun: boolean) {
  const email = str(row.EMAIL).toLowerCase();
  const firstName = str(row.ADI);
  const lastName = str(row.SOYADI);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!email || !fullName) {
    return { status: "skipped" as const, reason: "Eksik ad veya e-posta", email };
  }
  if (isDemoEmail(email)) {
    return { status: "skipped" as const, reason: "Demo hesap", email };
  }

  const existingDealer = await prisma.dealer.findUnique({ where: { email } });
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingDealer || existingUser) {
    return { status: "skipped" as const, reason: "Zaten kayıtlı", email };
  }

  const phone = pickPhone(row);
  const taxNumber = str(row.VERGINO) || str(row.TCKNO);
  const taxOffice = str(row.VERGIDAIRESI);
  const address = str(row.ADRES);
  const location = buildLocation(row);
  const now = new Date();

  if (dryRun) {
    return { status: "would_create" as const, email, fullName };
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const dealer = await prisma.dealer.create({
    data: {
      name: fullName,
      title: firstName,
      email,
      phone,
      company: fullName,
      location: location || "Türkiye",
      companySize: "1-10",
      markets: "Türkiye",
      group: DEFAULT_GROUP,
      taxNumber,
      taxOffice,
      billingAddress: address,
      shippingAddress: address,
      status: "active",
    },
  });

  await prisma.user.create({
    data: {
      email,
      name: fullName,
      password: passwordHash,
      role: "dealer",
      status: "active",
      phone,
      company: fullName,
      taxNumber,
      taxOffice,
      dealerId: dealer.id,
      kvkkAcceptedAt: now,
      approvedAt: now,
      reviewedBy: "import-emabayi",
      adminNote: "EMA bayi toplu import",
    },
  });

  await prisma.dealerApproval.create({
    data: {
      dealerId: dealer.id,
      status: "ACTIVE",
      companyName: fullName,
      taxNumber,
      taxOffice,
      phone,
      address,
      documentStatus: "APPROVED",
      paymentStatus: "PAID",
      approvedAt: now,
      adminNote: "EMA bayi toplu import — onboarding tamamlandı",
    },
  });

  return { status: "created" as const, email, fullName };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const filePath =
    fileIdx >= 0 ? args[fileIdx + 1] : "/Users/korhanbariskaynar/Downloads/emabayi1.xlsx";

  if (!filePath || !existsSync(filePath)) {
    console.error("Dosya bulunamadı:", filePath);
    process.exit(1);
  }

  const wb = XLSX.read(readFileSync(filePath));
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  console.log(`\n=== EMA Bayi Import ${dryRun ? "(DRY-RUN)" : "(CANLI)"} ===`);
  console.log(`Dosya: ${filePath}`);
  console.log(`Satır: ${rows.length}\n`);

  if (!dryRun) await ensureBronzeGroup();

  const stats = { created: 0, skipped: 0, wouldCreate: 0 };
  const skipReasons: Record<string, number> = {};

  for (const row of rows) {
    const result = await importRow(row, dryRun);
    if (result.status === "created") {
      stats.created++;
      if (stats.created <= 5 || stats.created % 50 === 0) {
        console.log(`✓ ${result.email} — ${result.fullName}`);
      }
    } else if (result.status === "would_create") {
      stats.wouldCreate++;
    } else {
      stats.skipped++;
      skipReasons[result.reason] = (skipReasons[result.reason] || 0) + 1;
    }
  }

  console.log("\n--- Özet ---");
  if (dryRun) {
    console.log(`Eklenecek: ${stats.wouldCreate}`);
  } else {
    console.log(`Oluşturulan: ${stats.created}`);
  }
  console.log(`Atlanan: ${stats.skipped}`);
  if (Object.keys(skipReasons).length) {
    console.log("Atlama nedenleri:", skipReasons);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
