CREATE TABLE "CartRecoverySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "adminAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerReminderHours" INTEGER NOT NULL DEFAULT 2,
    "dealerReminderHours" INTEGER NOT NULL DEFAULT 4,
    "secondReminderHours" INTEGER NOT NULL DEFAULT 24,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "approvedByAdminId" TEXT NOT NULL DEFAULT '',
    "approvedByAdminName" TEXT NOT NULL DEFAULT '',
    "lastAdminAlertAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
