-- ENA_DROPSHIP_STABILIZE_V1: StoreOrder metadata
ALTER TABLE "StoreOrder" ADD COLUMN "orderNumber" TEXT;
ALTER TABLE "StoreOrder" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_MANUAL';
ALTER TABLE "StoreOrder" ADD COLUMN "notificationStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED';

CREATE UNIQUE INDEX "StoreOrder_orderNumber_key" ON "StoreOrder"("orderNumber");
