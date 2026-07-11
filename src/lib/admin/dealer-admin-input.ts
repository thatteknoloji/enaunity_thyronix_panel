type DealerAdminInputOptions = {
  requireCoreFields?: boolean;
};

type DealerAdminPayload = Record<string, unknown>;

function toTrimmedString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeDealerAdminInput(
  input: DealerAdminPayload,
  options: DealerAdminInputOptions = {}
) {
  const data: Record<string, unknown> = {};

  if ("name" in input) data.name = toTrimmedString(input.name);
  if ("title" in input) data.title = toTrimmedString(input.title);
  if ("email" in input) data.email = toTrimmedString(input.email).toLowerCase();
  if ("phone" in input) data.phone = toTrimmedString(input.phone);
  if ("company" in input) data.company = toTrimmedString(input.company);
  if ("website" in input) data.website = toTrimmedString(input.website);
  if ("location" in input) data.location = toTrimmedString(input.location);
  if ("companySize" in input) data.companySize = toTrimmedString(input.companySize);
  if ("markets" in input) data.markets = toTrimmedString(input.markets);
  if ("group" in input) data.group = toTrimmedString(input.group) || "bronze";
  if ("taxNumber" in input) data.taxNumber = toTrimmedString(input.taxNumber);
  if ("taxOffice" in input) data.taxOffice = toTrimmedString(input.taxOffice);
  if ("billingAddress" in input) data.billingAddress = toTrimmedString(input.billingAddress);
  if ("shippingAddress" in input) data.shippingAddress = toTrimmedString(input.shippingAddress);
  if ("status" in input) data.status = toTrimmedString(input.status) || "active";

  if ("discountRate" in input) data.discountRate = toNumber(input.discountRate);
  if ("creditLimit" in input) data.creditLimit = toNumber(input.creditLimit);
  if ("openingBalance" in input) data.openingBalance = toNumber(input.openingBalance);
  if ("balance" in input) data.balance = toNumber(input.balance);
  if ("allowNegative" in input) data.allowNegative = Boolean(input.allowNegative);

  if (options.requireCoreFields) {
    const requiredData = {
      name: typeof data.name === "string" ? data.name : "",
      email: typeof data.email === "string" ? data.email : "",
      company: typeof data.company === "string" ? data.company : "",
    };

    if (!requiredData.name || !requiredData.email || !requiredData.company) {
      throw new Error("İsim, e-posta ve şirket zorunludur");
    }

    return {
      name: requiredData.name,
      title: typeof data.title === "string" ? data.title : "",
      email: requiredData.email,
      phone: typeof data.phone === "string" ? data.phone : "",
      company: requiredData.company,
      website: typeof data.website === "string" ? data.website : "",
      location: typeof data.location === "string" ? data.location : "",
      companySize: typeof data.companySize === "string" ? data.companySize : "",
      markets: typeof data.markets === "string" ? data.markets : "",
      discountRate: typeof data.discountRate === "number" ? data.discountRate : 0,
      creditLimit: typeof data.creditLimit === "number" ? data.creditLimit : 0,
      openingBalance: typeof data.openingBalance === "number" ? data.openingBalance : 0,
      balance:
        typeof data.balance === "number"
          ? data.balance
          : typeof data.openingBalance === "number"
            ? data.openingBalance
            : 0,
      allowNegative: typeof data.allowNegative === "boolean" ? data.allowNegative : false,
      group: typeof data.group === "string" ? data.group : "bronze",
      taxNumber: typeof data.taxNumber === "string" ? data.taxNumber : "",
      taxOffice: typeof data.taxOffice === "string" ? data.taxOffice : "",
      billingAddress: typeof data.billingAddress === "string" ? data.billingAddress : "",
      shippingAddress: typeof data.shippingAddress === "string" ? data.shippingAddress : "",
      status: typeof data.status === "string" ? data.status : "active",
    };
  }

  return data;
}
