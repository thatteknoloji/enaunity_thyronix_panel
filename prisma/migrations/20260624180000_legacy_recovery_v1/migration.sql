-- Link Kurtarma Merkezi V1

CREATE TABLE IF NOT EXISTS "LegacyUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "lastmod" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "classification" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "recoveryStrategy" TEXT NOT NULL DEFAULT 'IGNORE',
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "suggestedTargetUrl" TEXT,
    "generatedBlogId" TEXT,
    "generatedPageId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "LegacyRedirectRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "legacyUrlId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "LegacyGoneRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "legacyUrlId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyUrl_normalizedUrl_projectId_key" ON "LegacyUrl"("normalizedUrl", "projectId");
CREATE INDEX IF NOT EXISTS "LegacyUrl_status_idx" ON "LegacyUrl"("status");
CREATE INDEX IF NOT EXISTS "LegacyUrl_classification_idx" ON "LegacyUrl"("classification");
CREATE INDEX IF NOT EXISTS "LegacyUrl_recoveryStrategy_idx" ON "LegacyUrl"("recoveryStrategy");
CREATE INDEX IF NOT EXISTS "LegacyUrl_projectId_idx" ON "LegacyUrl"("projectId");

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyRedirectRule_sourceUrl_key" ON "LegacyRedirectRule"("sourceUrl");
CREATE INDEX IF NOT EXISTS "LegacyRedirectRule_enabled_idx" ON "LegacyRedirectRule"("enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyGoneRule_url_key" ON "LegacyGoneRule"("url");
CREATE INDEX IF NOT EXISTS "LegacyGoneRule_enabled_idx" ON "LegacyGoneRule"("enabled");
