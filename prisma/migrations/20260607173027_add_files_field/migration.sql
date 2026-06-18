-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnerApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "markets" TEXT NOT NULL,
    "portfolio" TEXT NOT NULL DEFAULT '',
    "techLevel" TEXT NOT NULL DEFAULT '',
    "motivation" TEXT NOT NULL DEFAULT '',
    "files" TEXT NOT NULL DEFAULT '[]',
    "kvkk" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PartnerApplication" ("company", "companySize", "createdAt", "email", "id", "kvkk", "location", "markets", "motivation", "name", "partnerType", "phone", "portfolio", "status", "techLevel", "title", "updatedAt", "website") SELECT "company", "companySize", "createdAt", "email", "id", "kvkk", "location", "markets", "motivation", "name", "partnerType", "phone", "portfolio", "status", "techLevel", "title", "updatedAt", "website" FROM "PartnerApplication";
DROP TABLE "PartnerApplication";
ALTER TABLE "new_PartnerApplication" RENAME TO "PartnerApplication";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
