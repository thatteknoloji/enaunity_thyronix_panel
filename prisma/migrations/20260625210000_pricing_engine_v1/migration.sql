-- ENA_PRICING_ENGINE_V1

CREATE TABLE "PricingMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "baseCost" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PricingMaterial_code_key" ON "PricingMaterial"("code");
CREATE INDEX "PricingMaterial_isActive_idx" ON "PricingMaterial"("isActive");

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "materialId" TEXT,
    "formulaType" TEXT NOT NULL,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "minPrice" REAL NOT NULL DEFAULT 0,
    "wastePercent" REAL NOT NULL DEFAULT 0,
    "laborCost" REAL NOT NULL DEFAULT 0,
    "printCost" REAL NOT NULL DEFAULT 0,
    "cuttingCost" REAL NOT NULL DEFAULT 0,
    "packagingCost" REAL NOT NULL DEFAULT 0,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "profitPercent" REAL NOT NULL DEFAULT 0,
    "dealerDiscountPercent" REAL NOT NULL DEFAULT 0,
    "taxPercent" REAL NOT NULL DEFAULT 20,
    "roundingMode" TEXT NOT NULL DEFAULT 'NONE',
    "formulaJson" TEXT NOT NULL DEFAULT '{}',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingRule_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "PricingMaterial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PricingRule_code_key" ON "PricingRule"("code");
CREATE INDEX "PricingRule_status_idx" ON "PricingRule"("status");
CREATE INDEX "PricingRule_productType_idx" ON "PricingRule"("productType");
CREATE INDEX "PricingRule_materialId_idx" ON "PricingRule"("materialId");

CREATE TABLE "PricingVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" REAL NOT NULL DEFAULT 0,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingVariant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PricingRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PricingVariant_ruleId_code_key" ON "PricingVariant"("ruleId", "code");
CREATE INDEX "PricingVariant_ruleId_idx" ON "PricingVariant"("ruleId");
CREATE INDEX "PricingVariant_isActive_idx" ON "PricingVariant"("isActive");

CREATE TABLE "PricingOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" REAL NOT NULL DEFAULT 0,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingOption_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PricingRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PricingOption_ruleId_code_key" ON "PricingOption"("ruleId", "code");
CREATE INDEX "PricingOption_ruleId_idx" ON "PricingOption"("ruleId");
CREATE INDEX "PricingOption_isActive_idx" ON "PricingOption"("isActive");

CREATE TABLE "PricingCalculationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT,
    "inputJson" TEXT NOT NULL DEFAULT '{}',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "sourceType" TEXT,
    "sourceReferenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingCalculationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PricingRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PricingCalculationLog_ruleId_idx" ON "PricingCalculationLog"("ruleId");
CREATE INDEX "PricingCalculationLog_createdAt_idx" ON "PricingCalculationLog"("createdAt");
