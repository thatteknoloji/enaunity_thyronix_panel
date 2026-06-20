import { prisma } from "@/lib/db";
import { createNotification, sendEmail } from "@/lib/notifications";

export type CampaignAudience = "all" | "members" | "dealers" | "custom";
export type CampaignChannel = "panel_only" | "email_only" | "panel_and_email";

export type AudienceFilter = {
  userIds?: string[];
  dealerIds?: string[];
  groups?: string[];
  moduleKeys?: string[];
  requireCommercialConsent?: boolean;
};

export function parseAudienceFilter(raw: string | null | undefined): AudienceFilter {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

type Recipient = {
  userId?: string;
  dealerId?: string;
  email: string;
  name: string;
  hasCommercialConsent: boolean;
};

export async function resolveCampaignRecipients(
  audience: CampaignAudience,
  filter: AudienceFilter
): Promise<Recipient[]> {
  const recipients: Recipient[] = [];
  const seen = new Set<string>();

  const addUser = (u: {
    id: string;
    email: string;
    name: string;
    dealerId: string | null;
    role: string;
    contractsAcceptedJson: string;
  }) => {
    if (u.role === "admin") return;
    const key = u.dealerId ? `d:${u.dealerId}` : `u:${u.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    let hasCommercialConsent = false;
    try {
      const accepted = JSON.parse(u.contractsAcceptedJson || "[]");
      hasCommercialConsent = Array.isArray(accepted) && accepted.includes("ticari-elektronik-ileti-onayi");
    } catch {
      /* ignore */
    }
    recipients.push({
      userId: u.dealerId ? undefined : u.id,
      dealerId: u.dealerId || undefined,
      email: u.email,
      name: u.name,
      hasCommercialConsent,
    });
  };

  if (audience === "custom") {
    if (filter.userIds?.length) {
      const users = await prisma.user.findMany({ where: { id: { in: filter.userIds } } });
      users.forEach(addUser);
    }
    if (filter.dealerIds?.length) {
      const users = await prisma.user.findMany({ where: { dealerId: { in: filter.dealerIds } } });
      users.forEach(addUser);
      for (const dealerId of filter.dealerIds) {
        if (seen.has(`d:${dealerId}`)) continue;
        const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
        if (dealer) {
          seen.add(`d:${dealerId}`);
          recipients.push({
            dealerId,
            email: dealer.email,
            name: dealer.name,
            hasCommercialConsent: true,
          });
        }
      }
    }
    return recipients;
  }

  const where: Record<string, unknown> = { role: { not: "admin" }, status: { in: ["active", "pending"] } };

  if (audience === "members") {
    where.role = "user";
    where.dealerId = null;
  } else if (audience === "dealers") {
    where.OR = [{ role: "dealer" }, { dealerId: { not: null } }];
  }

  const users = await prisma.user.findMany({ where: where as any });
  for (const u of users) {
    if (filter.groups?.length && u.dealerId) {
      const dealer = await prisma.dealer.findUnique({ where: { id: u.dealerId }, select: { group: true } });
      if (!dealer || !filter.groups.includes(dealer.group)) continue;
    }
    if (filter.moduleKeys?.length && u.dealerId) {
      const lic = await prisma.moduleLicense.findFirst({
        where: { dealerId: u.dealerId, moduleKey: { in: filter.moduleKeys }, status: "ACTIVE" },
      });
      if (!lic) continue;
    }
    addUser(u);
  }

  return recipients;
}

function wrapEmailHtml(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">${body || `<p>${title}</p>`}</div>`;
}

export async function sendNotificationCampaign(campaignId: string) {
  const campaign = await prisma.notificationCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Kampanya bulunamadı");
  if (campaign.status === "sent" || campaign.status === "cancelled") {
    throw new Error("Kampanya zaten gönderilmiş veya iptal edilmiş");
  }

  await prisma.notificationCampaign.update({
    where: { id: campaignId },
    data: { status: "sending" },
  });

  const filter = parseAudienceFilter(campaign.audienceFilterJson);
  const recipients = await resolveCampaignRecipients(campaign.audience as CampaignAudience, filter);
  const isMarketing = campaign.type === "promo" || campaign.type === "marketing";

  let delivered = 0;
  let emailSent = 0;

  for (const r of recipients) {
    const sendPanel = campaign.channel === "panel_only" || campaign.channel === "panel_and_email";
    const sendMail = campaign.channel === "email_only" || campaign.channel === "panel_and_email";

    if (isMarketing && filter.requireCommercialConsent !== false && !r.hasCommercialConsent) {
      await prisma.notificationDelivery.create({
        data: {
          campaignId,
          userId: r.userId,
          dealerId: r.dealerId,
          email: r.email,
          channel: campaign.channel,
          status: "skipped",
          error: "Ticari ileti onayı yok",
        },
      });
      continue;
    }

    let notificationId = "";
    let deliveryStatus = "delivered";
    let deliveryError = "";

    if (sendPanel) {
      const n = await createNotification({
        userId: r.userId,
        dealerId: r.dealerId,
        title: campaign.title,
        message: campaign.message,
        type: campaign.type,
        link: campaign.link,
        campaignId,
      });
      notificationId = n.id;
      delivered++;
    }

    if (sendMail && r.email) {
      try {
        const subject = campaign.emailSubject || campaign.title;
        const html = campaign.emailHtml || wrapEmailHtml(campaign.title, `<p>${campaign.message}</p>`);
        await sendEmail({ to: r.email, subject, html });
        emailSent++;
      } catch (e) {
        deliveryStatus = sendPanel ? "delivered" : "failed";
        deliveryError = e instanceof Error ? e.message : "email failed";
      }
    }

    await prisma.notificationDelivery.create({
      data: {
        campaignId,
        userId: r.userId,
        dealerId: r.dealerId,
        email: r.email,
        channel: campaign.channel,
        status: deliveryStatus,
        error: deliveryError,
        notificationId,
      },
    });
  }

  await prisma.notificationCampaign.update({
    where: { id: campaignId },
    data: {
      status: "sent",
      sentAt: new Date(),
      recipientCount: recipients.length,
      deliveredCount: delivered,
      emailSentCount: emailSent,
    },
  });

  return { recipientCount: recipients.length, delivered, emailSent };
}

export async function runScheduledCampaignJobs() {
  const now = new Date();
  const due = await prisma.notificationCampaign.findMany({
    where: { status: "scheduled", scheduledAt: { lte: now } },
    take: 10,
  });

  const results = [];
  for (const c of due) {
    try {
      results.push({ id: c.id, ...(await sendNotificationCampaign(c.id)) });
    } catch (e) {
      await prisma.notificationCampaign.update({
        where: { id: c.id },
        data: { status: "draft" },
      });
      results.push({ id: c.id, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return results;
}
