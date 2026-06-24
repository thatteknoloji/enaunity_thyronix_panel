import { prisma } from "@/lib/db";

export type BalanceTopUpSettings = {
  enabled: boolean;
  minAmount: number;
  presets: number[];
  belowMinMessage: string;
  splitEnabled: boolean;
  bankTransferEnabled: boolean;
  pendingMessage: string;
};

const DEFAULTS: BalanceTopUpSettings = {
  enabled: true,
  minAmount: 5000,
  presets: [5000, 10000, 20000],
  belowMinMessage: "Minimum bakiye yükleme tutarı 5.000 ₺'dir.",
  splitEnabled: true,
  bankTransferEnabled: true,
  pendingMessage: "Havale onayı genellikle 1-2 iş günü sürer.",
};

function parseJson(raw: string): Partial<BalanceTopUpSettings> {
  try {
    return JSON.parse(raw || "{}") as Partial<BalanceTopUpSettings>;
  } catch {
    return {};
  }
}

export async function getBalanceTopUpSettings(): Promise<BalanceTopUpSettings> {
  try {
    const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
    const parsed = parseJson(row?.balanceTopUpJson || "{}");
    return {
      ...DEFAULTS,
      ...parsed,
      presets: parsed.presets?.length ? parsed.presets : DEFAULTS.presets,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function updateBalanceTopUpSettings(input: Partial<BalanceTopUpSettings>): Promise<BalanceTopUpSettings> {
  const current = await getBalanceTopUpSettings();
  const next = { ...current, ...input };
  try {
    await prisma.paymentGatewaySettings.upsert({
      where: { id: "default" },
      create: { id: "default", balanceTopUpJson: JSON.stringify(next) },
      update: { balanceTopUpJson: JSON.stringify(next) },
    });
  } catch {
    // migration henüz uygulanmamış olabilir
  }
  return next;
}
