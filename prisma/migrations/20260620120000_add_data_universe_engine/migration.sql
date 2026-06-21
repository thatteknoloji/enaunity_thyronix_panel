-- Data Universe Engine — GEO + referans tabloları (idempotent)

CREATE TABLE IF NOT EXISTS "GeoCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoCountry_code_key" ON "GeoCountry"("code");
CREATE INDEX IF NOT EXISTS "GeoCountry_isActive_idx" ON "GeoCountry"("isActive");
CREATE INDEX IF NOT EXISTS "GeoCountry_code_idx" ON "GeoCountry"("code");

CREATE TABLE IF NOT EXISTS "GeoProvince" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "plateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeoProvince_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoProvince_countryId_slug_key" ON "GeoProvince"("countryId", "slug");
CREATE INDEX IF NOT EXISTS "GeoProvince_countryId_idx" ON "GeoProvince"("countryId");
CREATE INDEX IF NOT EXISTS "GeoProvince_plateCode_idx" ON "GeoProvince"("plateCode");
CREATE INDEX IF NOT EXISTS "GeoProvince_isActive_idx" ON "GeoProvince"("isActive");
CREATE INDEX IF NOT EXISTS "GeoProvince_name_idx" ON "GeoProvince"("name");

CREATE TABLE IF NOT EXISTS "GeoDistrict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeoDistrict_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "GeoProvince" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoDistrict_provinceId_slug_key" ON "GeoDistrict"("provinceId", "slug");
CREATE INDEX IF NOT EXISTS "GeoDistrict_provinceId_idx" ON "GeoDistrict"("provinceId");
CREATE INDEX IF NOT EXISTS "GeoDistrict_isActive_idx" ON "GeoDistrict"("isActive");
CREATE INDEX IF NOT EXISTS "GeoDistrict_name_idx" ON "GeoDistrict"("name");

CREATE TABLE IF NOT EXISTS "GeoNeighborhood" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeoNeighborhood_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "GeoDistrict" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoNeighborhood_districtId_slug_key" ON "GeoNeighborhood"("districtId", "slug");
CREATE INDEX IF NOT EXISTS "GeoNeighborhood_districtId_idx" ON "GeoNeighborhood"("districtId");
CREATE INDEX IF NOT EXISTS "GeoNeighborhood_isActive_idx" ON "GeoNeighborhood"("isActive");
CREATE INDEX IF NOT EXISTS "GeoNeighborhood_name_idx" ON "GeoNeighborhood"("name");

CREATE TABLE IF NOT EXISTS "GeoVillage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeoVillage_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "GeoDistrict" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeoVillage_districtId_slug_key" ON "GeoVillage"("districtId", "slug");
CREATE INDEX IF NOT EXISTS "GeoVillage_districtId_idx" ON "GeoVillage"("districtId");
CREATE INDEX IF NOT EXISTS "GeoVillage_isActive_idx" ON "GeoVillage"("isActive");
CREATE INDEX IF NOT EXISTS "GeoVillage_name_idx" ON "GeoVillage"("name");

CREATE TABLE IF NOT EXISTS "Industry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Industry_slug_key" ON "Industry"("slug");
CREATE INDEX IF NOT EXISTS "Industry_isActive_idx" ON "Industry"("isActive");
CREATE INDEX IF NOT EXISTS "Industry_name_idx" ON "Industry"("name");

CREATE TABLE IF NOT EXISTS "IndustryCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IndustryCategory_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IndustryCategory_industryId_slug_key" ON "IndustryCategory"("industryId", "slug");
CREATE INDEX IF NOT EXISTS "IndustryCategory_industryId_idx" ON "IndustryCategory"("industryId");
CREATE INDEX IF NOT EXISTS "IndustryCategory_isActive_idx" ON "IndustryCategory"("isActive");

CREATE TABLE IF NOT EXISTS "SearchIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchIntent_slug_key" ON "SearchIntent"("slug");
CREATE INDEX IF NOT EXISTS "SearchIntent_isActive_idx" ON "SearchIntent"("isActive");
CREATE INDEX IF NOT EXISTS "SearchIntent_name_idx" ON "SearchIntent"("name");

CREATE TABLE IF NOT EXISTS "QuestionPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "QuestionPattern_type_idx" ON "QuestionPattern"("type");
CREATE INDEX IF NOT EXISTS "QuestionPattern_isActive_idx" ON "QuestionPattern"("isActive");
