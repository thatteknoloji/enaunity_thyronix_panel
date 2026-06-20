import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/notifications";
import { appendLegalAuditLog } from "./audit-log";
import type { LegalContext } from "./constants";
import type { RequestMeta } from "./request-meta";

export type RecordAcceptanceInput = {
  slug: string;
  userId?: string | null;
  dealerId?: string | null;
  email: string;
  context: LegalContext;
  optional?: boolean;
  meta: RequestMeta;
};

export async function getActiveContractVersion(slug: string) {
  const contract = await prisma.contract.findUnique({
    where: { slug },
    include: {
      versions: { where: { isActive: true }, orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!contract || !contract.active) return null;
  const version = contract.versions[0];
  if (!version) return null;
  return { contract, version };
}

export async function recordLegalAcceptance(input: RecordAcceptanceInput) {
  const active = await getActiveContractVersion(input.slug);
  if (!active) throw new Error(`Sözleşme bulunamadı: ${input.slug}`);

  const { contract, version } = active;

  const acceptance = await prisma.legalAcceptance.create({
    data: {
      userId: input.userId || null,
      dealerId: input.dealerId || null,
      email: input.email,
      contractId: contract.id,
      contractVersionId: version.id,
      contractSlug: contract.slug,
      contractTitle: contract.title,
      contractVersionNum: version.version,
      contentHash: version.contentHash,
      context: input.context,
      optional: !!input.optional,
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
      browser: input.meta.browser,
      os: input.meta.os,
      deviceType: input.meta.deviceType,
      sessionId: input.meta.sessionId,
      referrer: input.meta.referrer,
    },
  });

  await appendLegalAuditLog({
    eventType: "legal_acceptance",
    userId: input.userId,
    email: input.email,
    ipAddress: input.meta.ipAddress,
    payload: {
      acceptanceId: acceptance.id,
      slug: contract.slug,
      version: version.version,
      hash: version.contentHash,
      context: input.context,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://enaunity.com.tr";
  const subject = `Sözleşme Onayı — ${contract.title} (v${version.version})`;
  const html = `
    <p>Sayın kullanıcı,</p>
    <p>Aşağıdaki sözleşmeyi onayladınız:</p>
    <ul>
      <li><strong>${contract.title}</strong></li>
      <li>Versiyon: ${version.version}</li>
      <li>Onay tarihi (UTC): ${acceptance.acceptedAt.toISOString()}</li>
      <li>IP: ${input.meta.ipAddress}</li>
    </ul>
    <p><a href="${siteUrl}/contracts/${contract.slug}">Sözleşmeyi görüntüle</a></p>
    <p>ENA UNITY</p>`;

  let emailStatus = "skipped";
  let emailError = "";
  if (process.env.SMTP_USER) {
    try {
      await sendEmail({ to: input.email, subject, html });
      emailStatus = "sent";
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : "send failed";
    }
    await prisma.legalEmailLog.create({
      data: {
        acceptanceId: acceptance.id,
        userId: input.userId || null,
        email: input.email,
        subject,
        status: emailStatus,
        error: emailError,
      },
    });
    await appendLegalAuditLog({
      eventType: "legal_email",
      userId: input.userId,
      email: input.email,
      ipAddress: input.meta.ipAddress,
      payload: { acceptanceId: acceptance.id, status: emailStatus },
    });
  }

  return acceptance;
}

export async function recordMultipleAcceptances(
  slugs: string[],
  base: Omit<RecordAcceptanceInput, "slug">
) {
  const results = [];
  for (const slug of slugs) {
    results.push(await recordLegalAcceptance({ ...base, slug }));
  }
  return results;
}

export async function userMissingRequiredSlugs(
  userId: string,
  requiredSlugs: readonly string[]
): Promise<string[]> {
  const acceptances = await prisma.legalAcceptance.findMany({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });

  const latestBySlug = new Map<string, string>();
  for (const a of acceptances) {
    if (!latestBySlug.has(a.contractSlug)) latestBySlug.set(a.contractSlug, a.contentHash);
  }

  const missing: string[] = [];
  for (const slug of requiredSlugs) {
    const active = await getActiveContractVersion(slug);
    if (!active) continue;
    if (latestBySlug.get(slug) !== active.version.contentHash) missing.push(slug);
  }
  return missing;
}

export async function publishContractVersion(contractId: string, title: string, content: string) {
  const { sha256Content } = await import("./hash");
  const hash = sha256Content(content);
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  const nextVersion = contract.version + 1;

  await prisma.contractVersion.updateMany({
    where: { contractId, isActive: true },
    data: { isActive: false },
  });

  const version = await prisma.contractVersion.create({
    data: {
      contractId,
      version: nextVersion,
      title,
      content,
      contentHash: hash,
      isActive: true,
    },
  });

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      title,
      content,
      version: nextVersion,
      contentHash: hash,
      publishedAt: new Date(),
    },
  });

  await appendLegalAuditLog({
    eventType: "contract_published",
    payload: { contractId, slug: contract.slug, version: nextVersion, hash },
  });

  return version;
}

export async function upsertContractWithVersion(seed: {
  title: string;
  slug: string;
  type: string;
  category: string;
  content: string;
}) {
  const { sha256Content } = await import("./hash");
  const hash = sha256Content(seed.content);

  const existing = await prisma.contract.findUnique({
    where: { slug: seed.slug },
    include: { versions: { where: { isActive: true }, take: 1 } },
  });

  if (!existing) {
    const contract = await prisma.contract.create({
      data: {
        title: seed.title,
        slug: seed.slug,
        type: seed.type,
        category: seed.category,
        content: seed.content,
        version: 1,
        contentHash: hash,
        active: true,
      },
    });
    await prisma.contractVersion.create({
      data: {
        contractId: contract.id,
        version: 1,
        title: seed.title,
        content: seed.content,
        contentHash: hash,
        isActive: true,
      },
    });
    return contract;
  }

  const activeVersion = existing.versions[0];
  if (activeVersion && activeVersion.contentHash === hash) {
    await prisma.contract.update({
      where: { id: existing.id },
      data: { title: seed.title, type: seed.type, category: seed.category, active: true },
    });
    return existing;
  }

  await publishContractVersion(existing.id, seed.title, seed.content);
  return prisma.contract.findUniqueOrThrow({ where: { slug: seed.slug } });
}
