/**
 * Accounting Convergence Sprint tests
 * Run: npm run test:accounting-convergence
 */
import { prisma } from "../src/lib/db";
import {
  ensureDealerAccount,
  postAccountTransaction,
  getDealerBalance,
  syncLegacyDealerBalance,
  deductDealerBalance,
  addDealerBalance,
  getAccountSummary,
  createStatement,
} from "../src/lib/accounting/accounting-service";
import { getAccountingEngine, isDealerAccountEngine } from "../src/lib/accounting/config";

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

const TEST_PREFIX = "acct-test-";

async function cleanup(dealerId: string) {
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerStatement.deleteMany({ where: { dealerId } });
  await prisma.dealerTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
}

async function main() {
  console.log("\n=== Accounting Convergence Tests ===\n");

  process.env.ACCOUNTING_ENGINE = "dealer_account";
  process.env.LEGACY_DEALER_BALANCE_ENABLED = "false";

  console.log("1) Feature flags");
  assert(isDealerAccountEngine(), "ACCOUNTING_ENGINE=dealer_account");
  assert(getAccountingEngine() === "dealer_account", "Engine is dealer_account");

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  const dealer2 = await prisma.dealer.findFirst({
    where: { status: "active", NOT: { id: dealer?.id } },
  });
  if (!dealer) {
    console.error("Active dealer not found");
    process.exit(1);
  }

  await cleanup(dealer.id);
  if (dealer2) await cleanup(dealer2.id);

  const originalBalance = dealer.balance;

  console.log("\n2) ensureDealerAccount seeds from legacy balance");
  await prisma.dealer.update({ where: { id: dealer.id }, data: { balance: 1500 } });
  const account = await ensureDealerAccount(dealer.id);
  assert(account.currentBalance === 1500, "Account seeded from Dealer.balance");

  console.log("\n3) postAccountTransaction updates balance");
  await postAccountTransaction({
    dealerId: dealer.id,
    type: "ORDER_COST",
    title: "Test sipariş maliyeti",
    debit: 200,
  });
  const afterDebit = await prisma.dealerAccount.findUnique({ where: { dealerId: dealer.id } });
  assert(afterDebit?.currentBalance === 1300, "Debit reduces currentBalance");

  console.log("\n4) Payment credit");
  await postAccountTransaction({
    dealerId: dealer.id,
    type: "PAYMENT",
    title: "Test ödeme",
    credit: 500,
  });
  const afterCredit = await prisma.dealerAccount.findUnique({ where: { dealerId: dealer.id } });
  assert(afterCredit?.currentBalance === 1800, "Credit increases currentBalance");

  console.log("\n5) syncLegacyDealerBalance");
  await prisma.dealer.update({ where: { id: dealer.id }, data: { balance: 0 } });
  const synced = await syncLegacyDealerBalance(dealer.id);
  assert(synced === 1800, "syncLegacyDealerBalance updates Dealer.balance");
  const dealerAfterSync = await prisma.dealer.findUnique({ where: { id: dealer.id } });
  assert(dealerAfterSync?.balance === 1800, "Dealer.balance matches account");

  console.log("\n6) deductDealerBalance / addDealerBalance wrappers");
  await deductDealerBalance(dealer.id, 100, undefined, "ORDER_COST", "Wrapper debit");
  await addDealerBalance(dealer.id, 50, undefined, "REFUND", "Wrapper credit");
  const bal = await getDealerBalance(dealer.id);
  assert(bal.balance === 1750, "Wrapper functions adjust balance correctly");
  assert(bal.source === "dealer_account", "Balance source is dealer_account");

  console.log("\n7) Legacy mirror written");
  const mirrorCount = await prisma.dealerTransaction.count({ where: { dealerId: dealer.id } });
  assert(mirrorCount > 0, "DealerTransaction mirror records created");

  console.log("\n8) Statement generation");
  const now = new Date();
  const stmt = await createStatement(dealer.id, now.getFullYear(), now.getMonth() + 1);
  assert(!!stmt.statement.id, "Monthly statement created");
  assert(Array.isArray(stmt.lines), "Statement lines generated");

  console.log("\n9) Account summary");
  const summary = await getAccountSummary(dealer.id);
  assert(summary.recentTransactions.length > 0, "getAccountSummary returns transactions");

  if (dealer2) {
    console.log("\n10) Dealer isolation");
    await ensureDealerAccount(dealer2.id);
    const summary1 = await getAccountSummary(dealer.id);
    const summary2 = await getAccountSummary(dealer2.id);
    assert(summary1.account.dealerId !== summary2.account.dealerId, "Dealers have separate accounts");
  } else {
    assert(true, "Dealer isolation skipped (single dealer)");
  }

  await cleanup(dealer.id);
  if (dealer2) await cleanup(dealer2.id);
  await prisma.dealer.update({ where: { id: dealer.id }, data: { balance: originalBalance } });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
