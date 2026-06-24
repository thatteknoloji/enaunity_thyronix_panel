-- CreateEnum
CREATE TABLE IF NOT EXISTS "_prisma_migrations_check" (id INTEGER);
DROP TABLE IF EXISTS "_prisma_migrations_check";

-- BlogPostStatus enum (SQLite: TEXT check)
-- BlogSourceType enum (SQLite: TEXT check)

-- CreateTable
CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "dealerId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "keyword" TEXT NOT NULL DEFAULT '',
    "keywordGroup" TEXT,
    "province" TEXT,
    "district" TEXT,
    "category" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "contentJson" TEXT NOT NULL DEFAULT '{}',
    "faqJson" TEXT NOT NULL DEFAULT '[]',
    "schemaJson" TEXT NOT NULL DEFAULT '{}',
    "internalLinksJson" TEXT NOT NULL DEFAULT '[]',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "originalityScore" INTEGER NOT NULL DEFAULT 0,
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "geoScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "sourceJson" TEXT NOT NULL DEFAULT '{}',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_sourceType_idx" ON "BlogPost"("sourceType");
CREATE INDEX IF NOT EXISTS "BlogPost_keyword_province_district_sourceReferenceId_idx" ON "BlogPost"("keyword", "province", "district", "sourceReferenceId");
CREATE INDEX IF NOT EXISTS "BlogPost_dealerId_idx" ON "BlogPost"("dealerId");
CREATE INDEX IF NOT EXISTS "BlogPost_projectId_idx" ON "BlogPost"("projectId");
