import { prisma } from "@/lib/db";
import type { User } from "@/types";
import { getDealerModuleLicense } from "@/lib/modules/access";
import {
  DEFAULT_AUTOMATION,
  DEFAULT_FEED_TRANSFORM,
  getPlanLimits,
  normalizePlanKey,
  type ThyronixAutomationSettings,
  type ThyronixTeamMember,
} from "./commercial";
import { normalizeFeedTransformSettings } from "./feed-transform";
import { isThyronixAdmin } from "./access";

export async function resolveDealerId(user: User): Promise<string | null> {
  if (user.dealerId) return user.dealerId;
  if (isThyronixAdmin(user)) return null;
  return null;
}

export async function getThyronixPlanKey(dealerId: string | null): Promise<string> {
  if (!dealerId) return "enterprise";
  const license = await getDealerModuleLicense(dealerId, "THYRONIX");
  return license?.planKey || "starter";
}

export async function getWorkspaceSettings(user: User) {
  const dealerId = await resolveDealerId(user);
  return getWorkspaceSettingsByDealerId(dealerId);
}

export async function updateWorkspaceSettings(
  user: User,
  patch: Partial<{
    onboardingCompleted: boolean;
    onboardingStep: number;
    onboarding: Record<string, unknown>;
    automation: ThyronixAutomationSettings;
    team: ThyronixTeamMember[];
    checklist: Record<string, unknown>;
  }>
) {
  const dealerId = await resolveDealerId(user);
  if (!dealerId) throw new Error("Forbidden");
  return updateWorkspaceSettingsByDealerId(dealerId, patch);
}

export async function getWorkspaceSettingsByDealerId(dealerId: string | null) {
  if (!dealerId) {
    return {
      dealerId: null,
      onboardingCompleted: true,
      onboardingStep: 5,
      onboarding: {},
      automation: DEFAULT_AUTOMATION,
      team: [] as ThyronixTeamMember[],
      checklist: {},
      planKey: "enterprise",
      limits: getPlanLimits("enterprise"),
    };
  }

  let row = await prisma.thyronixWorkspaceSettings.findUnique({ where: { dealerId } });
  if (!row) {
    row = await prisma.thyronixWorkspaceSettings.create({ data: { dealerId } });
  }

  const planKey = await getThyronixPlanKey(dealerId);
  return {
    dealerId,
    onboardingCompleted: row.onboardingCompleted,
    onboardingStep: row.onboardingStep,
    onboarding: safeJson(row.onboardingJson, {}),
    automation: mergeAutomationSettings(safeJson(row.automationJson, {})),
    team: safeJson<ThyronixTeamMember[]>(row.teamJson, []),
    checklist: safeJson(row.checklistJson, {}),
    planKey: normalizePlanKey(planKey),
    limits: getPlanLimits(planKey),
  };
}

export async function updateWorkspaceSettingsByDealerId(
  dealerId: string | null,
  patch: Partial<{
    onboardingCompleted: boolean;
    onboardingStep: number;
    onboarding: Record<string, unknown>;
    automation: ThyronixAutomationSettings;
    team: ThyronixTeamMember[];
    checklist: Record<string, unknown>;
  }>
) {
  if (!dealerId) throw new Error("Forbidden");

  const existing = await prisma.thyronixWorkspaceSettings.findUnique({ where: { dealerId } });
  const base = existing || (await prisma.thyronixWorkspaceSettings.create({ data: { dealerId } }));

  const data: Record<string, unknown> = {};
  if (patch.onboardingCompleted !== undefined) data.onboardingCompleted = patch.onboardingCompleted;
  if (patch.onboardingStep !== undefined) data.onboardingStep = patch.onboardingStep;
  if (patch.onboarding !== undefined) data.onboardingJson = JSON.stringify(patch.onboarding);
  if (patch.automation !== undefined) data.automationJson = JSON.stringify(patch.automation);
  if (patch.team !== undefined) data.teamJson = JSON.stringify(patch.team);
  if (patch.checklist !== undefined) data.checklistJson = JSON.stringify(patch.checklist);

  return prisma.thyronixWorkspaceSettings.update({ where: { id: base.id }, data });
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function mergeAutomationSettings(raw: Partial<ThyronixAutomationSettings>): ThyronixAutomationSettings {
  return {
    ...DEFAULT_AUTOMATION,
    ...raw,
    feedTransform: normalizeFeedTransformSettings(raw.feedTransform ?? DEFAULT_FEED_TRANSFORM),
  };
}

export async function checkPlanLimit(
  dealerId: string | null,
  resource: "sources" | "products" | "feeds",
  currentCount: number
): Promise<{ ok: boolean; limit: number; planKey: string }> {
  const planKey = await getThyronixPlanKey(dealerId);
  const limits = getPlanLimits(planKey);
  const limitMap = { sources: limits.maxSources, products: limits.maxProducts, feeds: limits.maxFeeds };
  const limit = limitMap[resource];
  return { ok: currentCount < limit, limit, planKey: normalizePlanKey(planKey) };
}
