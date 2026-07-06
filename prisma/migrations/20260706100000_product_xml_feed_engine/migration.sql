-- CreateTable
CREATE TABLE "ProductXmlFeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "rootCategory" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "templateId" TEXT NOT NULL DEFAULT 'custom',
    "mappingJson" TEXT NOT NULL DEFAULT '{}',
    "variantMappingJson" TEXT NOT NULL DEFAULT '{}',
    "categoryMappingJson" TEXT NOT NULL DEFAULT '{}',
    "rulesJson" TEXT NOT NULL DEFAULT '{}',
    "syncIntervalHours" INTEGER NOT NULL DEFAULT 12,
    "lastSyncAt" DATETIME,
    "nextSyncAt" DATETIME,
    "lastSyncStatus" TEXT NOT NULL DEFAULT '',
    "lastSyncReportJson" TEXT NOT NULL DEFAULT '{}',
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductFeedLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL DEFAULT '',
    "sourceModelCode" TEXT NOT NULL DEFAULT '',
    "lockedFieldsJson" TEXT NOT NULL DEFAULT '{}',
    "lastSyncedAt" DATETIME,
    "lastFeedSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductFeedLink_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "ProductXmlFeed" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductFeedLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductFeedVariantLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedLinkId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sourceSku" TEXT NOT NULL DEFAULT '',
    "sourceBarcode" TEXT NOT NULL DEFAULT '',
    "lockedFieldsJson" TEXT NOT NULL DEFAULT '{}',
    "lastFeedSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductFeedVariantLink_feedLinkId_fkey" FOREIGN KEY ("feedLinkId") REFERENCES "ProductFeedLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductFeedVariantLink_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductXmlFeedSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "added" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" TEXT NOT NULL DEFAULT '[]',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductXmlFeedSyncLog_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "ProductXmlFeed" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductXmlFeed_status_idx" ON "ProductXmlFeed"("status");

-- CreateIndex
CREATE INDEX "ProductXmlFeed_nextSyncAt_idx" ON "ProductXmlFeed"("nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeedLink_productId_key" ON "ProductFeedLink"("productId");

-- CreateIndex
CREATE INDEX "ProductFeedLink_feedId_sourceModelCode_idx" ON "ProductFeedLink"("feedId", "sourceModelCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeedLink_feedId_externalId_key" ON "ProductFeedLink"("feedId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeedVariantLink_variantId_key" ON "ProductFeedVariantLink"("variantId");

-- CreateIndex
CREATE INDEX "ProductXmlFeedSyncLog_feedId_createdAt_idx" ON "ProductXmlFeedSyncLog"("feedId", "createdAt");
