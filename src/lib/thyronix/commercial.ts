export const THYRONIX_TEAM_ROLES = ["OWNER", "MANAGER", "EDITOR", "VIEWER"] as const;
export type ThyronixTeamRole = (typeof THYRONIX_TEAM_ROLES)[number];

export const THYRONIX_PLAN_KEYS = ["starter", "professional", "enterprise"] as const;
export type ThyronixPlanKey = (typeof THYRONIX_PLAN_KEYS)[number];

export type ThyronixPlanLimits = {
  maxSources: number;
  maxProducts: number;
  maxFeeds: number;
  aiEnabled: boolean;
  automationEnabled: boolean;
  multiUser: boolean;
  maxTeamMembers: number;
};

export const THYRONIX_PLAN_DEFAULTS: Record<ThyronixPlanKey, ThyronixPlanLimits> = {
  starter: {
    maxSources: 3,
    maxProducts: 10_000,
    maxFeeds: 2,
    aiEnabled: false,
    automationEnabled: false,
    multiUser: false,
    maxTeamMembers: 1,
  },
  professional: {
    maxSources: 10,
    maxProducts: 100_000,
    maxFeeds: 10,
    aiEnabled: true,
    automationEnabled: true,
    multiUser: true,
    maxTeamMembers: 5,
  },
  enterprise: {
    maxSources: 999,
    maxProducts: 999_999,
    maxFeeds: 999,
    aiEnabled: true,
    automationEnabled: true,
    multiUser: true,
    maxTeamMembers: 50,
  },
};

export type ThyronixTeamMember = {
  id: string;
  email: string;
  name: string;
  role: ThyronixTeamRole;
  active: boolean;
};

export type ThyronixAutomationSettings = {
  autoSync: boolean;
  syncIntervalMinutes: number;
  autoGenerateFeed: boolean;
  feedIntervalHours: 4 | 6 | 12 | 24;
  notifications: boolean;
  retryPolicy: "none" | "3x" | "5x";
  notifyOnError: boolean;
  feedTransform: ThyronixFeedTransformSettings;
};

export type ThyronixFeedTransformSettings = {
  enabled: boolean;
  targetBrand: string;
  sourceBrandAliases: string[];
  bannedWords: string[];
  titlePrefix: string;
  titleSuffix: string;
  descriptionPrefix: string;
  descriptionSuffix: string;
  maxTitleLength: number;
};

export const FEED_REFRESH_INTERVALS = [4, 6, 12, 24] as const;

export const DEFAULT_FEED_TRANSFORM: ThyronixFeedTransformSettings = {
  enabled: false,
  targetBrand: "",
  sourceBrandAliases: [],
  bannedWords: ["çakma", "taklit", "replika", "muadil"],
  titlePrefix: "",
  titleSuffix: "",
  descriptionPrefix: "",
  descriptionSuffix: "",
  maxTitleLength: 120,
};

export const DEFAULT_AUTOMATION: ThyronixAutomationSettings = {
  autoSync: true,
  syncIntervalMinutes: 60,
  autoGenerateFeed: true,
  feedIntervalHours: 6,
  notifications: true,
  retryPolicy: "3x",
  notifyOnError: true,
  feedTransform: DEFAULT_FEED_TRANSFORM,
};

export function normalizePlanKey(planKey?: string | null): ThyronixPlanKey {
  const k = (planKey || "starter").toLowerCase();
  if (k.includes("enterprise") || k.includes("ent")) return "enterprise";
  if (k.includes("pro") || k.includes("professional")) return "professional";
  return "starter";
}

export function getPlanLimits(planKey?: string | null): ThyronixPlanLimits {
  return THYRONIX_PLAN_DEFAULTS[normalizePlanKey(planKey)];
}

export function canUseFeature(planKey: string | null | undefined, feature: keyof ThyronixPlanLimits): boolean {
  const limits = getPlanLimits(planKey);
  const val = limits[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val > 0;
  return false;
}

export function roleCanEdit(role: ThyronixTeamRole): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "EDITOR";
}

export function roleCanManageTeam(role: ThyronixTeamRole): boolean {
  return role === "OWNER" || role === "MANAGER";
}
