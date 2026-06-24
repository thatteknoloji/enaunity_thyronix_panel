-- Dealer Balance Top-Up V1
ALTER TABLE "PaymentGatewaySettings" ADD COLUMN IF NOT EXISTS "balanceTopUpJson" TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "DealerBalanceTopUp" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "gatewayRef" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "returnUrl" TEXT NOT NULL DEFAULT '',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerBalanceTopUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DealerBalanceTopUp_dealerId_status_idx" ON "DealerBalanceTopUp"("dealerId", "status");
CREATE INDEX IF NOT EXISTS "DealerBalanceTopUp_status_createdAt_idx" ON "DealerBalanceTopUp"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DealerBalanceTopUp" ADD CONSTRAINT "DealerBalanceTopUp_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
