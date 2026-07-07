-- Thyronix rules profile + source custom rules linkage
CREATE TABLE "ThyronixRulesProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "dealerId" TEXT,
    "tenantScope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "ownerType" TEXT NOT NULL DEFAULT 'ADMIN',
    "priceRulesJson" TEXT NOT NULL DEFAULT '{}',
    "stockRulesJson" TEXT NOT NULL DEFAULT '{}',
    "gateRulesJson" TEXT NOT NULL DEFAULT '{}',
    "aiRulesJson" TEXT NOT NULL DEFAULT '{}',
    "outputFormat" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ThyronixRulesProfile_dealerId_idx" ON "ThyronixRulesProfile"("dealerId");
CREATE INDEX "ThyronixRulesProfile_scope_idx" ON "ThyronixRulesProfile"("scope");
CREATE INDEX "ThyronixRulesProfile_isDefault_idx" ON "ThyronixRulesProfile"("isDefault");

ALTER TABLE "ThyronixSource" ADD COLUMN "useCustomRules" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ThyronixSource" ADD COLUMN "rulesProfileId" TEXT;
CREATE INDEX "ThyronixSource_rulesProfileId_idx" ON "ThyronixSource"("rulesProfileId");
