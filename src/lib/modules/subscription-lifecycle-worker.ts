import { prisma } from "@/lib/db";
import { createNotification, sendEmail } from "@/lib/notifications";
import { getModuleLabel } from "@/lib/modules/access";
import { daysSinceEnd, daysUntilEnd } from "@/lib/modules/subscription-utils";

const SUBSCRIPTION_MODULE_KEYS = ["THYRONIX", "HIVE", "HIVE_PRO"];

async function notifyDealer(
  dealerId: string,
  title: string,
  message: string,
  link: string,
  emailSubject: string,
  emailHtml: string
) {
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  if (!dealer) return;

  const user = await prisma.user.findFirst({ where: { dealerId } });

  await createNotification({
    dealerId,
    userId: user?.id,
    title,
    message,
    type: "subscription",
    link,
  });

  if (dealer.email) {
    await sendEmail({ to: dealer.email, subject: emailSubject, html: emailHtml }).catch(() => {});
  }
}

async function disableDealerModuleAccess(dealerId: string, moduleKey: string, stage: "passive" | "blocked" | "purged") {
  const users = await prisma.user.findMany({ where: { dealerId }, select: { id: true } });
  const productType = moduleKey === "HIVE_PRO" ? "HIVE" : moduleKey;
  if (!["THYRONIX", "HIVE"].includes(productType)) return;

  for (const u of users) {
    const links = await prisma.productAccountLink.findMany({
      where: { enaUserId: u.id, productType, status: { in: ["PENDING", "LINKED", "DISABLED"] } },
    });
    for (const link of links) {
      if (stage === "purged") {
        await prisma.productAccountLink.update({
          where: { id: link.id },
          data: { status: "DELETED", metadataJson: JSON.stringify({ purgedAt: new Date().toISOString() }) },
        });
      } else if (stage === "blocked") {
        await prisma.productAccountLink.update({
          where: { id: link.id },
          data: { status: "DISABLED" },
        });
      }
    }
  }
}

export async function runSubscriptionLifecycleJobs() {
  const now = new Date();
  const licenses = await prisma.moduleLicense.findMany({
    where: {
      moduleKey: { in: SUBSCRIPTION_MODULE_KEYS },
      status: { in: ["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"] },
      endsAt: { not: null },
    },
  });

  let reminders = 0;
  let lifecycleActions = 0;

  for (const license of licenses) {
    if (!license.endsAt) continue;
    const moduleLabel = getModuleLabel(license.moduleKey);
    const daysLeft = daysUntilEnd(license.endsAt, now);
    const daysPast = daysSinceEnd(license.endsAt, now);
    const link = "/dealer/profile#subscriptions";

    if (daysLeft >= 0 && (license.status === "ACTIVE" || license.status === "TRIAL")) {
      if (daysLeft <= 30 && daysLeft >= 29 && !license.reminder30Sent) {
        await notifyDealer(
          license.dealerId,
          `${moduleLabel} — 1 ay kaldı`,
          `${moduleLabel} aboneliğinizin bitmesine 1 ay kaldı. Yenilemezseniz erişim kademeli olarak kapatılacaktır.`,
          link,
          `[ENA UNITY] ${moduleLabel} aboneliğinizin bitmesine 1 ay kaldı`,
          `<p>Sayın bayimiz,</p><p><strong>${moduleLabel}</strong> aboneliğinizin bitiş tarihi: <strong>${license.endsAt.toLocaleDateString("tr-TR")}</strong></p><p>Yenileme yapmazsanız 3 gün sonra pasif, 7 günde engelli, 15 günde veriler silinir.</p>`
        );
        await prisma.moduleLicense.update({ where: { id: license.id }, data: { reminder30Sent: true } });
        reminders++;
      }

      if (daysLeft <= 15 && daysLeft >= 14 && !license.reminder15Sent) {
        await notifyDealer(
          license.dealerId,
          `${moduleLabel} — 15 gün kaldı`,
          `${moduleLabel} aboneliğinizin bitmesine 15 gün kaldı.`,
          link,
          `[ENA UNITY] ${moduleLabel} — 15 gün kaldı`,
          `<p><strong>${moduleLabel}</strong> aboneliğiniz ${license.endsAt.toLocaleDateString("tr-TR")} tarihinde sona erecek.</p>`
        );
        await prisma.moduleLicense.update({ where: { id: license.id }, data: { reminder15Sent: true } });
        reminders++;
      }

      if (daysLeft <= 1 && !license.reminderLastDaySent) {
        const msg =
          daysLeft === 0
            ? `${moduleLabel} aboneliğiniz bugün sona eriyor.`
            : `${moduleLabel} aboneliğinizin son günü — yarın sona erecek.`;
        await notifyDealer(
          license.dealerId,
          daysLeft === 0 ? `${moduleLabel} — bugün son gün` : `${moduleLabel} — son gün`,
          msg,
          link,
          `[ENA UNITY] ${moduleLabel} abonelik uyarısı`,
          `<p>${msg}</p><p>Bitiş: ${license.endsAt.toLocaleDateString("tr-TR")}</p>`
        );
        await prisma.moduleLicense.update({ where: { id: license.id }, data: { reminderLastDaySent: true } });
        reminders++;
      }
      continue;
    }

    if (daysPast < 0) continue;

    if (license.lifecycleStage === "active" && daysPast >= 0) {
      await prisma.moduleLicense.update({
        where: { id: license.id },
        data: {
          status: "EXPIRED",
          lifecycleStage: "expired",
          lifecycleUpdatedAt: now,
        },
      });
      await notifyDealer(
        license.dealerId,
        `${moduleLabel} süresi doldu`,
        `${moduleLabel} aboneliğiniz sona erdi. 3 gün içinde yenilenmezse pasife alınacaktır.`,
        link,
        `[ENA UNITY] ${moduleLabel} aboneliğiniz sona erdi`,
        `<p><strong>${moduleLabel}</strong> aboneliğiniz sona erdi. Yenileme yapmazsanız 3/7/15 gün kuralı uygulanır.</p>`
      );
      lifecycleActions++;
      continue;
    }

    if (license.lifecycleStage === "expired" && daysPast >= 3) {
      await prisma.moduleLicense.update({
        where: { id: license.id },
        data: { status: "SUSPENDED", lifecycleStage: "passive", lifecycleUpdatedAt: now },
      });
      await disableDealerModuleAccess(license.dealerId, license.moduleKey, "passive");
      await notifyDealer(
        license.dealerId,
        `${moduleLabel} pasife alındı`,
        `${moduleLabel} yenilenmediği için pasife alındı. 7 gün içinde engellenecek.`,
        link,
        `[ENA UNITY] ${moduleLabel} pasife alındı`,
        `<p><strong>${moduleLabel}</strong> aboneliğiniz pasife alındı.</p>`
      );
      lifecycleActions++;
      continue;
    }

    if (license.lifecycleStage === "passive" && daysPast >= 7) {
      await prisma.moduleLicense.update({
        where: { id: license.id },
        data: { lifecycleStage: "blocked", lifecycleUpdatedAt: now },
      });
      await disableDealerModuleAccess(license.dealerId, license.moduleKey, "blocked");
      await notifyDealer(
        license.dealerId,
        `${moduleLabel} erişimi engellendi`,
        `${moduleLabel} modül erişiminiz engellendi. 15 gün içinde veriler silinecek.`,
        link,
        `[ENA UNITY] ${moduleLabel} erişimi engellendi`,
        `<p><strong>${moduleLabel}</strong> erişiminiz engellendi.</p>`
      );
      lifecycleActions++;
      continue;
    }

    if (license.lifecycleStage === "blocked" && daysPast >= 15) {
      await prisma.moduleLicense.update({
        where: { id: license.id },
        data: { status: "CANCELLED", lifecycleStage: "purged", lifecycleUpdatedAt: now },
      });
      await disableDealerModuleAccess(license.dealerId, license.moduleKey, "purged");
      await notifyDealer(
        license.dealerId,
        `${moduleLabel} verileri silindi`,
        `${moduleLabel} aboneliğiniz yenilenmediği için modül verileri silindi.`,
        link,
        `[ENA UNITY] ${moduleLabel} verileri silindi`,
        `<p><strong>${moduleLabel}</strong> modül verileriniz silindi.</p>`
      );
      lifecycleActions++;
    }
  }

  return { processed: licenses.length, reminders, lifecycleActions };
}

export async function getDealerSubscriptionSummaries(dealerId: string) {
  const licenses = await prisma.moduleLicense.findMany({
    where: { dealerId, moduleKey: { in: SUBSCRIPTION_MODULE_KEYS } },
    orderBy: { updatedAt: "desc" },
  });
  const seen = new Set<string>();
  const unique = licenses.filter((l) => {
    if (seen.has(l.moduleKey)) return false;
    seen.add(l.moduleKey);
    return true;
  });

  const { summarizeLicense } = await import("@/lib/modules/subscription-utils");
  return unique.map((l) =>
    summarizeLicense({
      moduleKey: l.moduleKey,
      moduleLabel: getModuleLabel(l.moduleKey),
      planKey: l.planKey,
      status: l.status,
      billingPeriod: l.billingPeriod,
      endsAt: l.endsAt,
      lifecycleStage: l.lifecycleStage,
    })
  );
}

/** Yenileme / yeni aktivasyonda hatırlatma bayraklarını sıfırla */
export async function resetLicenseLifecycleFlags(licenseId: string, endsAt: Date, billingPeriod: string) {
  await prisma.moduleLicense.update({
    where: { id: licenseId },
    data: {
      endsAt,
      billingPeriod,
      status: "ACTIVE",
      lifecycleStage: "active",
      lifecycleUpdatedAt: new Date(),
      reminder30Sent: false,
      reminder15Sent: false,
      reminderLastDaySent: false,
    },
  });
}
