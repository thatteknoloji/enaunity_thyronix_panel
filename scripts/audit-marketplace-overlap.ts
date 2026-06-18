/**
 * Read-only overlap audit for legacy vs hub marketplace systems.
 * Run: npm run audit:marketplace-overlap
 */
import { prisma } from "../src/lib/db";

type OverlapIssue = {
  severity: "HIGH" | "MEDIUM" | "LOW";
  type: string;
  message: string;
  details?: Record<string, unknown>;
};

async function main() {
  console.log("\n=== Marketplace Overlap Audit (read-only) ===\n");

  const issues: OverlapIssue[] = [];

  // 1) MarketplaceOrder with both processed (legacy) and dealerOrderId (hub)
  const dualProcessed = await prisma.marketplaceOrder.findMany({
    where: { processed: true, dealerOrderId: { not: null } },
    include: { connection: { select: { dealerId: true, platform: true } } },
    take: 100,
  });

  if (dualProcessed.length > 0) {
    issues.push({
      severity: "HIGH",
      type: "DUAL_PROCESSING",
      message: `${dualProcessed.length} MarketplaceOrder hem legacy processed hem hub dealerOrderId dolu`,
      details: {
        sampleIds: dualProcessed.slice(0, 5).map((o) => o.id),
      },
    });
  }

  // 2) Duplicate DealerOrder by dealerId + marketplace + marketplaceOrderId
  const dealerOrders = await prisma.dealerOrder.findMany({
    where: { marketplaceOrderId: { not: "" } },
    select: { id: true, dealerId: true, marketplace: true, marketplaceOrderId: true, sourceType: true },
  });

  const seen = new Map<string, string[]>();
  for (const o of dealerOrders) {
    const key = `${o.dealerId}|${o.marketplace}|${o.marketplaceOrderId}`;
    const list = seen.get(key) || [];
    list.push(o.id);
    seen.set(key, list);
  }

  const duplicateKeys = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicateKeys.length > 0) {
    issues.push({
      severity: "HIGH",
      type: "DUPLICATE_DEALER_ORDER",
      message: `${duplicateKeys.length} marketplaceOrderId için birden fazla DealerOrder`,
      details: { samples: duplicateKeys.slice(0, 5) },
    });
  }

  // 3) Balance vs DealerAccount divergence
  const dealers = await prisma.dealer.findMany({
    where: { status: "active" },
    select: { id: true, name: true, company: true, balance: true },
    take: 200,
  });

  const balanceMismatches: { dealerId: string; name: string; dealerBalance: number; accountBalance: number }[] = [];
  for (const d of dealers) {
    const account = await prisma.dealerAccount.findUnique({ where: { dealerId: d.id } });
    if (!account) continue;
    if (Math.abs(account.currentBalance - d.balance) > 0.01) {
      balanceMismatches.push({
        dealerId: d.id,
        name: d.company || d.name,
        dealerBalance: d.balance,
        accountBalance: account.currentBalance,
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

  // 4) MarketplaceOrder without dealerOrderId but processed=true (legacy only)
  const legacyOnlyProcessed = await prisma.marketplaceOrder.count({
    where: { processed: true, dealerOrderId: null },
  });
  if (legacyOnlyProcessed > 0) {
    issues.push({
      severity: "MEDIUM",
      type: "LEGACY_ONLY_PROCESSED",
      message: `${legacyOnlyProcessed} MarketplaceOrder legacy processed ama hub dealerOrderId yok`,
    });
  }

  // 5) Hub imported orders
  const hubOrders = await prisma.dealerOrder.count({
    where: { sourceType: "MARKETPLACE_HUB" },
  });
  const legacyMarketplaceOrders = await prisma.dealerOrder.count({
    where: { sourceType: "MARKETPLACE" },
  });

  // 6) Sync log SKIPPED entries
  const skippedLogs = await prisma.marketplaceSyncLog.count({
    where: { status: "SKIPPED" },
  });

  console.log("Summary:");
  console.log(`  Active connections: ${await prisma.marketplaceConnection.count({ where: { active: true } })}`);
  console.log(`  MarketplaceOrder total: ${await prisma.marketplaceOrder.count()}`);
  console.log(`  DealerOrder (MARKETPLACE_HUB): ${hubOrders}`);
  console.log(`  DealerOrder (MARKETPLACE legacy source): ${legacyMarketplaceOrders}`);
  console.log(`  SyncLog SKIPPED: ${skippedLogs}`);
  console.log(`  Issues found: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log("✓ No overlap issues detected.\n");
    process.exit(0);
  }

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.type}: ${issue.message}`);
    if (issue.details) {
      console.log(`  details: ${JSON.stringify(issue.details, null, 2)}`);
    }
  }

  console.log("");
  const hasHigh = issues.some((i) => i.severity === "HIGH");
  process.exit(hasHigh ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
