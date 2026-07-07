-- Sync diff detayları (Faz 5)
ALTER TABLE "ThyronixSyncLog" ADD COLUMN "detailsJson" TEXT;
ALTER TABLE "ThyronixSyncLog" ADD COLUMN "sourceId" TEXT;

CREATE INDEX "ThyronixSyncLog_sourceId_idx" ON "ThyronixSyncLog"("sourceId");
