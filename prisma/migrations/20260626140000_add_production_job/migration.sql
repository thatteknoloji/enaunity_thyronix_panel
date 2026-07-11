-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobNumber" TEXT NOT NULL,
    "orderSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "orderId" TEXT NOT NULL DEFAULT '',
    "dealerId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL DEFAULT '',
    "variant" TEXT NOT NULL DEFAULT '',
    "widthCm" REAL NOT NULL DEFAULT 0,
    "heightCm" REAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productionStatus" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedMachine" TEXT NOT NULL DEFAULT '',
    "assignedOperator" TEXT NOT NULL DEFAULT '',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "shipmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "cargoCompany" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "qualityPassed" BOOLEAN NOT NULL DEFAULT false,
    "qualityNote" TEXT NOT NULL DEFAULT '',
    "qualityPhotoUrl" TEXT NOT NULL DEFAULT '',
    "mockupUrl" TEXT NOT NULL DEFAULT '',
    "productionPngUrl" TEXT NOT NULL DEFAULT '',
    "pdfUrl" TEXT NOT NULL DEFAULT '',
    "svgUrl" TEXT NOT NULL DEFAULT '',
    "productionPackUrl" TEXT NOT NULL DEFAULT '',
    "pricingSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionJob_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");
CREATE INDEX "ProductionJob_productionStatus_idx" ON "ProductionJob"("productionStatus");
CREATE INDEX "ProductionJob_dealerId_idx" ON "ProductionJob"("dealerId");
CREATE INDEX "ProductionJob_orderSource_orderId_idx" ON "ProductionJob"("orderSource", "orderId");
CREATE INDEX "ProductionJob_priority_idx" ON "ProductionJob"("priority");
CREATE INDEX "ProductionJob_assignedMachine_idx" ON "ProductionJob"("assignedMachine");
CREATE INDEX "ProductionJob_assignedOperator_idx" ON "ProductionJob"("assignedOperator");
CREATE INDEX "ProductionJob_productType_idx" ON "ProductionJob"("productType");
CREATE INDEX "ProductionJob_createdAt_idx" ON "ProductionJob"("createdAt");
