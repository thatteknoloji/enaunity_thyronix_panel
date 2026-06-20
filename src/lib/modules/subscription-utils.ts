const TZ = "Europe/Istanbul";

export function daysBetweenInTz(from: Date, to: Date): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y1, m1, d1] = fmt.format(from).split("-").map(Number);
  const [y2, m2, d2] = fmt.format(to).split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86400000);
}

export function daysUntilEnd(endsAt: Date, now = new Date()): number {
  return daysBetweenInTz(now, endsAt);
}

export function daysSinceEnd(endsAt: Date, now = new Date()): number {
  return daysBetweenInTz(endsAt, now);
}

export function computeLicenseEndsAt(from: Date, billingPeriod: string): Date {
  const ends = new Date(from);
  if (billingPeriod === "yearly") {
    ends.setFullYear(ends.getFullYear() + 1);
  } else {
    ends.setMonth(ends.getMonth() + 1);
  }
  return ends;
}

export type ModuleSubscriptionSummary = {
  moduleKey: string;
  moduleLabel: string;
  planKey: string;
  status: string;
  billingPeriod: string;
  endsAt: string | null;
  daysRemaining: number | null;
  lifecycleStage: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
};

export function summarizeLicense(input: {
  moduleKey: string;
  moduleLabel: string;
  planKey: string;
  status: string;
  billingPeriod: string;
  endsAt: Date | null;
  lifecycleStage: string;
}): ModuleSubscriptionSummary {
  const daysRemaining = input.endsAt ? daysUntilEnd(input.endsAt) : null;
  const isExpired = input.endsAt ? daysRemaining !== null && daysRemaining < 0 : false;
  return {
    moduleKey: input.moduleKey,
    moduleLabel: input.moduleLabel,
    planKey: input.planKey,
    status: input.status,
    billingPeriod: input.billingPeriod,
    endsAt: input.endsAt?.toISOString() || null,
    daysRemaining,
    lifecycleStage: input.lifecycleStage,
    isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30,
    isExpired,
  };
}
