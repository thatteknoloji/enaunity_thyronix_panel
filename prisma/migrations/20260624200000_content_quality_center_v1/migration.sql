-- İçerik Kalite Merkezi V1

CREATE TABLE IF NOT EXISTS "ContentQualityAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "geoScore" INTEGER NOT NULL DEFAULT 0,
    "aeoScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "contentHealthScore" INTEGER NOT NULL DEFAULT 0,
    "internalLinkScore" INTEGER NOT NULL DEFAULT 0,
    "schemaScore" INTEGER NOT NULL DEFAULT 0,
    "metaScore" INTEGER NOT NULL DEFAULT 0,
    "issuesJson" TEXT NOT NULL DEFAULT '[]',
    "recommendationsJson" TEXT NOT NULL DEFAULT '[]',
    "auditedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContentQualityAudit_contentType_contentId_key" ON "ContentQualityAudit"("contentType", "contentId");
CREATE INDEX IF NOT EXISTS "ContentQualityAudit_contentType_idx" ON "ContentQualityAudit"("contentType");
CREATE INDEX IF NOT EXISTS "ContentQualityAudit_qualityScore_idx" ON "ContentQualityAudit"("qualityScore");
CREATE INDEX IF NOT EXISTS "ContentQualityAudit_auditedAt_idx" ON "ContentQualityAudit"("auditedAt");
