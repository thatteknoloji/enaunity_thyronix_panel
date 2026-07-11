/**
 * Read-only accounting overlap audit
 * Run: npm run audit:accounting-overlap
 */
import { prisma } from "../src/lib/db";
import { getAccountingEngine, isDealerAccountEngine } from "../src/lib/accounting/config";

type Issue = {
  severity: "HIGH" | "MEDIUM" | "LOW";
  type: string;
  message: string;
  details?: unknown;
};

async function main() {
  console.log("\n=== Accounting Overlap Audit (read-only) ===\n");
  console.log(`ACCOUNTING_ENGINE: ${getAccountingEngine()}`);
  console.log(`DealerAccount engine active: ${isDealerAccountEngine()}\n`);

  const issues: Issue[] = [];
  const dealers = await prisma.dealer.findMany({
    where: { status: "active" },
    select: { id: true, name: true, company: true, balance: true },
    take: 200,
  });

  const balanceMismatches: unknown[] = [];
  const txMismatches: unknown[] = [];

  for (const d of dealers) {
    const account = await prisma.dealerAccount.findUnique({ where: { dealerId: d.id } });
    const accountBalance = account?.currentBalance ?? null;

    if (account && Math.abs(d.balance - account.currentBalance) > 0.01) {
      balanceMismatches.push({
        dealerId: d.id,
        name: d.company || d.name,
        dealerBalance: d.balance,
        accountBalance: account.currentBalance,
        difference: Math.abs(d.balance - account.currentBalance),
      });
    }

    const [legacyCount, accountCount] = await Promise.all([
      prisma.dealerTransaction.count({ where: { dealerId: d.id } }),
      prisma.dealerAccountTransaction.count({ where: { dealerId: d.id } }),
    ]);

    if (accountCount > 0 && legacyCount > accountCount * 2) {
      txMismatches.push({
        dealerId: d.id,
        name: d.company || d.name,
        legacyTransactions: legacyCount,
        accountTransactions: accountCount,
      });
    }
  }

  if (balanceMismatches.length > 0) {
    issues.push({
      severity: "HIGH",
      type: "BALANCE_DIVERGENCE",
      message: `${balanceMismatches.length} bayide Dealer.balance ≠ DealerAccount.currentBalance`,
      details: { samples: balanceMismatches.slice(0, 10) },
    });
  }

  const noAccountCount = await prisma.dealer.count({
    where: {
      status: "active",
      id: { notIn: (await prisma.dealerAccount.findMany({ select: { dealerId: true } })).map((a) => a.dealerId) },
    },
  });

  if (noAccountCount > 0) {
    issues.push({
      severity: "MEDIUM",
      type: "MISSING_DEALER_ACCOUNT",
      message: `${noAccountCount} aktif bayinin DealerAccount kaydı yok (ilk erişimde oluşturulur)`,
    });
  }

  if (txMismatches.length > 0) {
    issues.push({
      severity: "MEDIUM",
      type: "TRANSACTION_COUNT_SKEW",
      message: `${txMismatches.length} bayide legacy transaction sayısı hesap transaction'dan çok yüksek`,
      details: { samples: txMismatches.slice(0, 5) },
    });
  }

  const riskDealers = await prisma.dealerAccount.findMany({
    where: { riskLevel: "HIGH" },
    include: { dealer: { select: { name: true, company: true } } },
    take: 10,
  });

  if (riskDealers.length > 0) {
    issues.push({
      severity: "LOW",
      type: "HIGH_RISK_DEALERS",
      message: `${riskDealers.length} bayi HIGH risk seviyesinde`,
      details: riskDealers.map((a) => ({
        dealer: a.dealer.company || a.dealer.name,
        balance: a.currentBalance,
        creditLimit: a.creditLimit,
      })),
    });
  }

  console.log("Summary:");
  console.log(`  Active dealers checked: ${dealers.length}`);
  console.log(`  Balance divergences: ${balanceMismatches.length}`);
  console.log(`  Missing DealerAccount: ${noAccountCount}`);
  console.log(`  Issues found: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log("✓ No accounting overlap issues detected.\n");
    process.exit(0);
  }

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.type}: ${issue.message}`);
    if (issue.details) console.log(`  details: ${JSON.stringify(issue.details, null, 2)}`);
  }

  console.log("");
  process.exit(issues.some((i) => i.severity === "HIGH") ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
