-- Product Library marketplace upload queue

CREATE TABLE "ProductMarketplaceJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dealerId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "recipeId" TEXT,
  "connectionId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT '',
  "storeName" TEXT NOT NULL DEFAULT '',
  "format" TEXT NOT NULL DEFAULT 'EXCEL',
  "targetUrl" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "fileName" TEXT NOT NULL DEFAULT '',
  "filePath" TEXT NOT NULL DEFAULT '',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "checksum" TEXT NOT NULL DEFAULT '',
  "payloadJson" TEXT NOT NULL DEFAULT '{}',
  "resultJson" TEXT NOT NULL DEFAULT '{}',
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "claimedBy" TEXT NOT NULL DEFAULT '',
  "claimedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProductMarketplaceJob_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "ProductPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductMarketplaceJob_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "ProductPackageRecipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProductMarketplaceJob_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "MarketplaceConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductMarketplaceJob_dealerId_status_createdAt_idx"
  ON "ProductMarketplaceJob" ("dealerId", "status", "createdAt");

CREATE INDEX "ProductMarketplaceJob_connectionId_status_createdAt_idx"
  ON "ProductMarketplaceJob" ("connectionId", "status", "createdAt");

CREATE INDEX "ProductMarketplaceJob_packageId_createdAt_idx"
  ON "ProductMarketplaceJob" ("packageId", "createdAt");

CREATE INDEX "ProductMarketplaceJob_recipeId_idx"
  ON "ProductMarketplaceJob" ("recipeId");
