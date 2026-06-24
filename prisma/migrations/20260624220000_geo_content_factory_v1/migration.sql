-- ENA_GEO_ICERIK_FABRIKASI_V1

CREATE TABLE IF NOT EXISTS "GeoContentJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "keywordGroup" TEXT,
    "category" TEXT,
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "publishedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "GeoContentJob_status_idx" ON "GeoContentJob"("status");
CREATE INDEX IF NOT EXISTS "GeoContentJob_keyword_idx" ON "GeoContentJob"("keyword");
CREATE INDEX IF NOT EXISTS "GeoContentJob_createdAt_idx" ON "GeoContentJob"("createdAt");
