-- ENA_ICERIK_PLANLAMA_MERKEZI_V1

CREATE TABLE IF NOT EXISTS "ContentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "primaryKeyword" TEXT NOT NULL,
    "keywordGroupJson" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'KEYWORD',
    "estimatedContentCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedGeoCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedFaqCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedLandingCount" INTEGER NOT NULL DEFAULT 0,
    "contentMapJson" TEXT NOT NULL DEFAULT '{}',
    "internalLinkMapJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "ContentPlanNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "parentNodeId" TEXT,
    "nodeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keyword" TEXT NOT NULL DEFAULT '',
    "province" TEXT,
    "district" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "estimatedTraffic" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentPlanNode_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ContentPlan_status_idx" ON "ContentPlan"("status");
CREATE INDEX IF NOT EXISTS "ContentPlan_primaryKeyword_idx" ON "ContentPlan"("primaryKeyword");
CREATE INDEX IF NOT EXISTS "ContentPlan_createdAt_idx" ON "ContentPlan"("createdAt");
CREATE INDEX IF NOT EXISTS "ContentPlanNode_planId_idx" ON "ContentPlanNode"("planId");
CREATE INDEX IF NOT EXISTS "ContentPlanNode_nodeType_idx" ON "ContentPlanNode"("nodeType");
CREATE INDEX IF NOT EXISTS "ContentPlanNode_parentNodeId_idx" ON "ContentPlanNode"("parentNodeId");
CREATE INDEX IF NOT EXISTS "ContentPlanNode_status_idx" ON "ContentPlanNode"("status");
