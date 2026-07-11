ALTER TABLE "Cart" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Cart" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Cart" ADD COLUMN "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CartItem" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CartItem" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "CartActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealerId" TEXT,
    "eventType" TEXT NOT NULL,
    "productId" TEXT NOT NULL DEFAULT '',
    "variantId" TEXT NOT NULL DEFAULT '',
    "quantityBefore" INTEGER NOT NULL DEFAULT 0,
    "quantityAfter" INTEGER NOT NULL DEFAULT 0,
    "cartItemCount" INTEGER NOT NULL DEFAULT 0,
    "cartTotalSnapshot" REAL NOT NULL DEFAULT 0,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartActivity_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartActivity_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CartReminderLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealerId" TEXT,
    "channel" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sentByAdminId" TEXT NOT NULL DEFAULT '',
    "sentByAdminName" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartReminderLog_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartReminderLog_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CartActivity_cartId_createdAt_idx" ON "CartActivity"("cartId", "createdAt");
CREATE INDEX "CartActivity_userId_createdAt_idx" ON "CartActivity"("userId", "createdAt");
CREATE INDEX "CartActivity_dealerId_createdAt_idx" ON "CartActivity"("dealerId", "createdAt");
CREATE INDEX "CartActivity_eventType_createdAt_idx" ON "CartActivity"("eventType", "createdAt");

CREATE INDEX "CartReminderLog_cartId_createdAt_idx" ON "CartReminderLog"("cartId", "createdAt");
CREATE INDEX "CartReminderLog_userId_createdAt_idx" ON "CartReminderLog"("userId", "createdAt");
CREATE INDEX "CartReminderLog_dealerId_createdAt_idx" ON "CartReminderLog"("dealerId", "createdAt");
CREATE INDEX "CartReminderLog_channel_templateKey_createdAt_idx" ON "CartReminderLog"("channel", "templateKey", "createdAt");
