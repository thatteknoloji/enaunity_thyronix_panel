/**
 * Bezos BAYİ XML kaynağını SADECE hedef bayi için tutar.
 * - Hedef bayi: BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS
 * - Diğer bayilerdeki bezos kaynakları temizlenir.
 * Run: npx tsx scripts/seed-esra-bezos-source.ts
 */
import { prisma } from "../src/lib/db";
import { buildBezosSourcePayload } from "../src/lib/thyronix/connectors/bezos-bayi-xml";
import { getBezosAllowedEmails } from "../src/lib/thyronix/connectors/bezos-bayi-access";

async function resolveTargetDealerId(): Promise<string | null> {
  const dealerIdFromEnv = process.env.BEZOS_BAYI_TARGET_DEALER_ID?.trim();
  if (dealerIdFromEnv) return dealerIdFromEnv;

  const allowedEmails = getBezosAllowedEmails();
  for (const email of allowedEmails) {
    const user = await prisma.user.findFirst({
      where: { email, dealerId: { not: null } },
      select: { dealerId: true },
    });
    if (user?.dealerId) return user.dealerId;
  }
  return null;
}

async function main() {
  const targetDealerId = await resolveTargetDealerId();
  if (!targetDealerId) {
    console.error("Hedef bayi bulunamadı. BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS ayarlayın.");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: targetDealerId } });
  if (!dealer) {
    console.error(`Hedef bayi kaydı bulunamadı: ${targetDealerId}`);
    process.exit(1);
  }
  const payload = buildBezosSourcePayload(dealer.name || dealer.company || "Esra Günen");

  const deletedOthers = await prisma.thyronixSource.deleteMany({
    where: {
      inputFormat: "bezos",
      OR: [
        { dealerId: { not: targetDealerId } },
        { dealerId: null },
        { tenantScope: "GLOBAL" },
      ],
    },
  });
  if (deletedOthers.count > 0) {
    console.log(`✓ Diğer bayilerdeki ${deletedOthers.count} bezos kaynağı temizlendi`);
  }

  const existing = await prisma.thyronixSource.findFirst({
    where: {
      dealerId: targetDealerId,
      inputFormat: "bezos",
      OR: [
        { name: payload.name },
        { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.thyronixSource.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        xmlUrl: payload.xmlUrl,
        type: payload.type,
        inputFormat: payload.inputFormat,
        fieldMapping: payload.fieldMapping,
        fixedValues: payload.fixedValues,
        interval: payload.interval,
        status: "active",
        errorLog: null,
      },
    });
    console.log("✓ Bezos kaynağı güncellendi:", updated.id, updated.name);
  } else {
    const created = await prisma.thyronixSource.create({
      data: {
        ...payload,
        dealerId: targetDealerId,
        tenantScope: "DEALER",
        ownerType: "DEALER",
      },
    });
    console.log("✓ Bezos kaynağı oluşturuldu:", created.id, created.name);
  }

  console.log("\nFeed URL'leri:");
  console.log("  1.", "https://bezos.com.tr/xml-bayi/?xml=BAY%C4%B0%20XML&B2BXML=1");
  console.log("  2.", "https://www.bezos.com.tr/xml-bayi/?xml=BAY%C4%B0%20XML&B2BXML=1&OFFSET=50000");
  console.log("\nEşleştirme ekranı: /thyronix/connectors/bezos-bayi (yalnızca hedef bayi)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
