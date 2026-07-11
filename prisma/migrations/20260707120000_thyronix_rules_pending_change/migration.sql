-- Thyronix kural değişikliği onay kuyruğu (Faz 4)
CREATE TABLE "ThyronixRulesPendingChange" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dealerId" TEXT,
    "proposedJson" TEXT NOT NULL,
    "previewJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ThyronixRulesPendingChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThyronixRulesPendingChange_profileId_idx" ON "ThyronixRulesPendingChange"("profileId");
CREATE INDEX "ThyronixRulesPendingChange_dealerId_idx" ON "ThyronixRulesPendingChange"("dealerId");
CREATE INDEX "ThyronixRulesPendingChange_status_idx" ON "ThyronixRulesPendingChange"("status");

ALTER TABLE "ThyronixRulesPendingChange" ADD CONSTRAINT "ThyronixRulesPendingChange_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ThyronixRulesProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
