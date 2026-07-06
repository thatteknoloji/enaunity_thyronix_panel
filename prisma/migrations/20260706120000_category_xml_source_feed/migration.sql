-- AlterTable
ALTER TABLE "Category" ADD COLUMN "sourceFeedId" TEXT;

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_sourceFeedId_idx" ON "Category"("sourceFeedId");
