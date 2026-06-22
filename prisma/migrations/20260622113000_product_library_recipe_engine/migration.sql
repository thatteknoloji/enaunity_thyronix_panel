-- Product Library recipe engine
ALTER TABLE "ProductPackage" ADD COLUMN "sourceColumnsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ProductPackage" ADD COLUMN "fieldRulesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ProductPackage" ADD COLUMN "exportFormatsJson" TEXT NOT NULL DEFAULT '["EXCEL","XML","CSV"]';

ALTER TABLE "ProductDistributionLog" ADD COLUMN "recipeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductDistributionLog" ADD COLUMN "recipeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductDistributionLog" ADD COLUMN "storeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductDistributionLog" ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductDistributionLog" ADD COLUMN "itemCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ProductPackageRecipe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "packageId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL DEFAULT '',
  "connectionLabel" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL,
  "storeName" TEXT NOT NULL DEFAULT '',
  "format" TEXT NOT NULL DEFAULT 'EXCEL',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "valuesJson" TEXT NOT NULL DEFAULT '{}',
  "lastPreviewJson" TEXT NOT NULL DEFAULT '{}',
  "lastDownloadedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProductPackageRecipe_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProductPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductPackageRecipe_packageId_idx" ON "ProductPackageRecipe"("packageId");
CREATE INDEX "ProductPackageRecipe_dealerId_idx" ON "ProductPackageRecipe"("dealerId");
CREATE INDEX "ProductPackageRecipe_connectionId_idx" ON "ProductPackageRecipe"("connectionId");
CREATE INDEX "ProductPackageRecipe_status_idx" ON "ProductPackageRecipe"("status");
