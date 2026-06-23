import { prisma } from "@/lib/db";

const SYSTEM_PAYMENT_DEALER_EMAIL = "system-payments@enaunity.local";

export async function getSystemPaymentDealer(owner?: { email?: string; name?: string; phone?: string }) {
  const email = owner?.email?.trim() || SYSTEM_PAYMENT_DEALER_EMAIL;
  const name = owner?.name?.trim() || "Sistem Ödeme";
  const phone = owner?.phone?.trim() || "0000000000";

  return prisma.dealer.upsert({
    where: { email },
    create: {
      name,
      title: "ENAUNITY Sistem Ödeme",
      email,
      phone,
      company: "ENAUNITY",
      location: "Sistem",
      companySize: "system",
      markets: "system",
      discountRate: 0,
      group: "bronze",
      creditLimit: 0,
      openingBalance: 0,
      balance: 0,
      allowNegative: false,
      status: "inactive",
    },
    update: {
      name,
      title: "ENAUNITY Sistem Ödeme",
      phone,
      company: "ENAUNITY",
      location: "Sistem",
      companySize: "system",
      markets: "system",
      status: "inactive",
    },
  });
}
