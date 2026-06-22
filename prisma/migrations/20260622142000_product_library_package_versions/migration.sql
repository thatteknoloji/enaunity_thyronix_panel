ALTER TABLE "ProductPackage" ADD COLUMN "currentVersionId" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ProductPackageVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL DEFAULT '',
  "versionNo" INTEGER NOT NULL DEFAULT 1,
  "sourceType" TEXT NOT NULL DEFAULT 'EXCEL',
  "sourceName" TEXT NOT NULL DEFAULT '',
  "sourcePath" TEXT NOT NULL DEFAULT '',
  "sourceUrl" TEXT NOT NULL DEFAULT '',
  "fileHash" TEXT NOT NULL DEFAULT '',
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "columnsJson" TEXT NOT NULL DEFAULT '[]',
  "sampleJson" TEXT NOT NULL DEFAULT '[]',
  "reportJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductPackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProductPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductPackageVersion_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ProductCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductPackageVersion_packageId_idx" ON "ProductPackageVersion"("packageId");
CREATE INDEX "ProductPackageVersion_catalogId_idx" ON "ProductPackageVersion"("catalogId");
CREATE INDEX "ProductPackageVersion_createdAt_idx" ON "ProductPackageVersion"("createdAt");
CREATE INDEX "ProductPackageVersion_status_idx" ON "ProductPackageVersion"("status");
