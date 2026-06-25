-- AlterTable
ALTER TABLE "DealerStore" ADD COLUMN "sector" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "StoreCategory" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "StoreMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL DEFAULT 'image/jpeg',
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreMedia_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "DealerStore" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StoreMedia_storeId_idx" ON "StoreMedia"("storeId");

-- CreateTable
CREATE TABLE "StoreBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "ctaText" TEXT NOT NULL DEFAULT '',
    "ctaLink" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreBanner_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "DealerStore" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StoreBanner_storeId_idx" ON "StoreBanner"("storeId");
