-- Production Center V1 — align schema (Commercial Order ≠ Production Job)
PRAGMA foreign_keys=OFF;

CREATE TABLE "ProductionJob_new" (
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
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "machineName" TEXT NOT NULL DEFAULT '',
    "operatorName" TEXT NOT NULL DEFAULT '',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "shipmentCompany" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "qualityPassed" BOOLEAN NOT NULL DEFAULT false,
    "qualityNote" TEXT NOT NULL DEFAULT '',
    "qualityPhotoUrl" TEXT NOT NULL DEFAULT '',
    "productionPackPath" TEXT NOT NULL DEFAULT '',
    "previewImage" TEXT NOT NULL DEFAULT '',
    "productionImage" TEXT NOT NULL DEFAULT '',
    "pdfPath" TEXT NOT NULL DEFAULT '',
    "svgPath" TEXT NOT NULL DEFAULT '',
    "pricingSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionJob_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "ProductionJob_new" (
    "id", "jobNumber", "orderSource", "orderId", "dealerId", "customerName",
    "productType", "variant", "widthCm", "heightCm", "quantity", "status", "priority",
    "machineName", "operatorName", "estimatedMinutes", "trackingNumber", "shipmentCompany",
    "notes", "qualityPassed", "qualityNote", "qualityPhotoUrl",
    "productionPackPath", "previewImage", "productionImage", "pdfPath", "svgPath",
    "pricingSnapshotJson", "metadataJson", "startedAt", "finishedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "jobNumber", "orderSource", "orderId", "dealerId", "customerName",
    "productType", "variant", "widthCm", "heightCm", "quantity",
    CASE "productionStatus"
        WHEN 'READY_TO_PRINT' THEN 'PRINTING'
        WHEN 'QUALITY_CONTROL' THEN 'PACKAGING'
        WHEN 'READY_FOR_SHIPMENT' THEN 'SHIPPED'
        ELSE "productionStatus"
    END,
    "priority",
    "assignedMachine", "assignedOperator", "estimatedMinutes", "trackingNumber", "cargoCompany",
    "notes", "qualityPassed", "qualityNote", "qualityPhotoUrl",
    "productionPackUrl", "mockupUrl", "productionPngUrl", "pdfUrl", "svgUrl",
    "pricingSnapshotJson", "metadataJson", "startedAt", "finishedAt", "createdAt", "updatedAt"
FROM "ProductionJob";

DROP TABLE "ProductionJob";
ALTER TABLE "ProductionJob_new" RENAME TO "ProductionJob";

CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");
CREATE INDEX "ProductionJob_status_idx" ON "ProductionJob"("status");
CREATE INDEX "ProductionJob_dealerId_idx" ON "ProductionJob"("dealerId");
CREATE INDEX "ProductionJob_orderSource_orderId_idx" ON "ProductionJob"("orderSource", "orderId");
CREATE INDEX "ProductionJob_priority_idx" ON "ProductionJob"("priority");
CREATE INDEX "ProductionJob_machineName_idx" ON "ProductionJob"("machineName");
CREATE INDEX "ProductionJob_operatorName_idx" ON "ProductionJob"("operatorName");
CREATE INDEX "ProductionJob_productType_idx" ON "ProductionJob"("productType");
CREATE INDEX "ProductionJob_createdAt_idx" ON "ProductionJob"("createdAt");

PRAGMA foreign_keys=ON;
