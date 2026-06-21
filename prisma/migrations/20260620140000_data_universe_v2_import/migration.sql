-- Data Universe V2 — GeoStreet + ImportJob

CREATE TABLE IF NOT EXISTS "GeoStreet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "neighborhoodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeoStreet_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "GeoNeighborhood" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoStreet_neighborhoodId_slug_key" ON "GeoStreet"("neighborhoodId", "slug");
CREATE INDEX IF NOT EXISTS "GeoStreet_neighborhoodId_idx" ON "GeoStreet"("neighborhoodId");
CREATE INDEX IF NOT EXISTS "GeoStreet_isActive_idx" ON "GeoStreet"("isActive");
CREATE INDEX IF NOT EXISTS "GeoStreet_name_idx" ON "GeoStreet"("name");

CREATE TABLE IF NOT EXISTS "DataUniverseImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL DEFAULT '',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "insertedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

CREATE INDEX IF NOT EXISTS "DataUniverseImportJob_status_idx" ON "DataUniverseImportJob"("status");
CREATE INDEX IF NOT EXISTS "DataUniverseImportJob_type_idx" ON "DataUniverseImportJob"("type");
CREATE INDEX IF NOT EXISTS "DataUniverseImportJob_createdAt_idx" ON "DataUniverseImportJob"("createdAt");
