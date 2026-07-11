-- ENA_YAYIN_MERKEZI_V1

CREATE TABLE IF NOT EXISTS "PublishingQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sourcePlanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "PublishingQueue_contentType_idx" ON "PublishingQueue"("contentType");
CREATE INDEX IF NOT EXISTS "PublishingQueue_contentId_idx" ON "PublishingQueue"("contentId");
CREATE INDEX IF NOT EXISTS "PublishingQueue_status_idx" ON "PublishingQueue"("status");
CREATE INDEX IF NOT EXISTS "PublishingQueue_publishMode_idx" ON "PublishingQueue"("publishMode");
CREATE INDEX IF NOT EXISTS "PublishingQueue_scheduledAt_idx" ON "PublishingQueue"("scheduledAt");
CREATE INDEX IF NOT EXISTS "PublishingQueue_sourcePlanId_idx" ON "PublishingQueue"("sourcePlanId");
CREATE INDEX IF NOT EXISTS "PublishingQueue_priority_idx" ON "PublishingQueue"("priority");
