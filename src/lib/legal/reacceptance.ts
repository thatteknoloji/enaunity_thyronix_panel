import { prisma } from "@/lib/db";
import { createNotification, sendEmail } from "@/lib/notifications";
import {
  DEALER_REQUIRED_SLUGS,
  HIVE_PURCHASE_SLUG,
  REGISTRATION_REQUIRED_SLUGS,
  THYRONIX_PURCHASE_SLUG,
} from "./constants";
import { getActiveContractVersion } from "./acceptance";
import { formatContractVersionLabel } from "./pdf-snapshot";
import { appendLegalAuditLog } from "./audit-log";

export type PendingReacceptItem = {
  slug: string;
  title: string;
  currentVersion: number;
  currentVersionLabel: string;
  acceptedVersion: number | null;
  acceptedVersionLabel: string | null;
  pdfUrl: string;
  blocks: ("account" | "dealer" | "hive" | "thyronix")[];
  taskId: string;
};

export type PendingReacceptState = {
  status: "ok" | "pending_reacceptance";
  pending: PendingReacceptItem[];
  blockedServices: {
    account: boolean;
    dealer: boolean;
    hive: boolean;
    thyronix: boolean;
  };
};

const SLUG_SERVICE_BLOCKS: Record<string, PendingReacceptItem["blocks"][number][]> = {
  "kvkk-aydinlatma-metni": ["account"],
  "acik-riza-metni": ["account"],
  "gizlilik-politikasi": ["account"],
  "cerez-politikasi": ["account"],
  "uyelik-sozlesmesi": ["account"],
  "bayilik-xml-dropshipping-sozlesmesi": ["dealer"],
  "iade-degisim-teslimat-politikasi": ["dealer"],
  "hive-thyronix-sozlesmesi": ["hive", "thyronix"],
};

const DEALER_ONLY_REACCEPT_SLUGS = new Set<string>([
  ...DEALER_REQUIRED_SLUGS,
  HIVE_PURCHASE_SLUG,
  THYRONIX_PURCHASE_SLUG,
]);

export function getApplicableSlugsForUser(user: {
  role: string;
  dealerId?: string | null;
  status?: string;
}): string[] {
  const slugs = new Set<string>([...REGISTRATION_REQUIRED_SLUGS]);
  if (user.role === "dealer" || user.dealerId) {
    for (const s of DEALER_REQUIRED_SLUGS) slugs.add(s);
  }
  if (user.role === "dealer" || user.dealerId) {
    slugs.add(HIVE_PURCHASE_SLUG);
    slugs.add(THYRONIX_PURCHASE_SLUG);
  }
  return [...slugs];
}

export async function getPendingReacceptanceForUser(userId: string): Promise<PendingReacceptState> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "admin") {
    return {
      status: "ok",
      pending: [],
      blockedServices: { account: false, dealer: false, hive: false, thyronix: false },
    };
  }

  const tasks = await prisma.legalReacceptanceTask.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  const pending: PendingReacceptItem[] = [];
  for (const task of tasks) {
    const active = await getActiveContractVersion(task.contractSlug);
    if (!active) continue;
    pending.push({
      slug: task.contractSlug,
      title: task.contractTitle,
      currentVersion: task.toVersionNum,
      currentVersionLabel: formatContractVersionLabel(task.toVersionNum),
      acceptedVersion: task.fromVersionNum || null,
      acceptedVersionLabel: task.fromVersionNum ? formatContractVersionLabel(task.fromVersionNum) : null,
      pdfUrl: active.version.pdfUrl || "",
      blocks: SLUG_SERVICE_BLOCKS[task.contractSlug] || ["account"],
      taskId: task.id,
    });
  }

  const blockedServices = {
    account: pending.some((p) => p.blocks.includes("account")),
    dealer: pending.some((p) => p.blocks.includes("dealer")),
    hive: pending.some((p) => p.blocks.includes("hive")),
    thyronix: pending.some((p) => p.blocks.includes("thyronix")),
  };

  return {
    status: pending.length > 0 ? "pending_reacceptance" : "ok",
    pending,
    blockedServices,
  };
}

export async function syncUserLegalReacceptStatus(userId: string) {
  const state = await getPendingReacceptanceForUser(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { legalReacceptStatus: state.status },
  });
  return state;
}

export async function notifyUsersOnContractPublish(input: {
  contractId: string;
  contractSlug: string;
  contractTitle: string;
  contractVersionId: string;
  newVersionNum: number;
  previousVersionNum: number;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://enaunity.com.tr";
  const acceptUrl = `${siteUrl}/account/legal-reaccept`;

  const priorAcceptances = await prisma.legalAcceptance.findMany({
    where: { contractId: input.contractId, userId: { not: null } },
    orderBy: { acceptedAt: "desc" },
  });

  const userMap = new Map<string, { email: string; dealerId: string | null; fromVersion: number }>();
  for (const a of priorAcceptances) {
    if (!a.userId || userMap.has(a.userId)) continue;
    if (a.contractVersionNum === input.newVersionNum) continue;
    userMap.set(a.userId, {
      email: a.email,
      dealerId: a.dealerId,
      fromVersion: a.contractVersionNum,
    });
  }

  for (const [userId, info] of userMap) {
    if (DEALER_ONLY_REACCEPT_SLUGS.has(input.contractSlug)) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, dealerId: true },
      });
      if (!user || (user.role !== "dealer" && !user.dealerId)) continue;
    }

    await prisma.legalReacceptanceTask.upsert({
      where: {
        userId_contractVersionId: { userId, contractVersionId: input.contractVersionId },
      },
      create: {
        userId,
        email: info.email,
        contractId: input.contractId,
        contractSlug: input.contractSlug,
        contractTitle: input.contractTitle,
        contractVersionId: input.contractVersionId,
        fromVersionNum: info.fromVersion,
        toVersionNum: input.newVersionNum,
        status: "pending",
        notifiedAt: new Date(),
      },
      update: {
        status: "pending",
        fromVersionNum: info.fromVersion,
        toVersionNum: input.newVersionNum,
        notifiedAt: new Date(),
        completedAt: null,
      },
    });

    await createNotification({
      userId,
      dealerId: info.dealerId || undefined,
      title: "Güncellenen sözleşme onayı gerekli",
      message: `${input.contractTitle} güncellendi (${formatContractVersionLabel(info.fromVersion)} → ${formatContractVersionLabel(input.newVersionNum)}). Onaylamanız gerekiyor.`,
      type: "legal_reaccept",
      link: "/account/legal-reaccept",
    });

    const subject = `[Ena Unity] Güncellenen Sözleşme Onayı Gerekiyor`;
    const html = `
      <p>Sayın kullanıcı,</p>
      <p><strong>${input.contractTitle}</strong> sözleşmesi güncellendi.</p>
      <ul>
        <li>Eski sürüm: ${formatContractVersionLabel(info.fromVersion)}</li>
        <li>Yeni sürüm: ${formatContractVersionLabel(input.newVersionNum)}</li>
        <li>Yayın tarihi (UTC): ${new Date().toISOString()}</li>
      </ul>
      <p><a href="${acceptUrl}">Sözleşmeyi okuyup onaylayın</a></p>
      <p>ENA UNITY</p>`;

    let emailStatus = "skipped";
    let emailError = "";
    if (process.env.SMTP_USER) {
      try {
        await sendEmail({ to: info.email, subject, html });
        emailStatus = "sent";
      } catch (e) {
        emailStatus = "failed";
        emailError = e instanceof Error ? e.message : "send failed";
      }
    }

    await prisma.legalEmailLog.create({
      data: {
        userId,
        email: info.email,
        subject,
        status: emailStatus,
        error: emailError,
      },
    });

    await prisma.legalReacceptanceTask.updateMany({
      where: { userId, contractVersionId: input.contractVersionId },
      data: { emailSentAt: new Date(), emailStatus },
    });

    await syncUserLegalReacceptStatus(userId);

    await appendLegalAuditLog({
      eventType: "reacceptance_required",
      userId,
      email: info.email,
      payload: {
        contractSlug: input.contractSlug,
        fromVersion: info.fromVersion,
        toVersion: input.newVersionNum,
      },
    });
  }
}

export async function completeReacceptanceTask(userId: string, contractVersionId: string) {
  await prisma.legalReacceptanceTask.updateMany({
    where: { userId, contractVersionId, status: "pending" },
    data: { status: "completed", completedAt: new Date() },
  });
  await syncUserLegalReacceptStatus(userId);
}

export async function getAdminReacceptanceReport() {
  const pendingTasks = await prisma.legalReacceptanceTask.findMany({
    where: { status: "pending" },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byContract = new Map<string, number>();
  for (const t of pendingTasks) {
    byContract.set(t.contractSlug, (byContract.get(t.contractSlug) || 0) + 1);
  }

  const recentEmails = await prisma.legalEmailLog.findMany({
    where: { subject: { contains: "Güncellenen Sözleşme" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const completedRecent = await prisma.legalReacceptanceTask.findMany({
    where: { status: "completed", completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return {
    pendingCount: pendingTasks.length,
    pendingByContract: Object.fromEntries(byContract),
    pendingTasks,
    recentEmails,
    completedRecent,
  };
}
