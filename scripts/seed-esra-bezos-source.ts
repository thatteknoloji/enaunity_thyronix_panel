/**
 * Esra Güden bayisi için Bezos BAYİ XML Thyronix kaynağı oluşturur.
 * Run: npx tsx scripts/seed-esra-bezos-source.ts
 */
import { prisma } from "../src/lib/db";
import { buildBezosSourcePayload } from "../src/lib/thyronix/connectors/bezos-bayi-xml";
import { resolveThyronixOwner } from "../src/lib/thyronix/tenant-access";

const ESRA_EMAIL = "esraguden840@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: ESRA_EMAIL } });
  if (!user?.dealerId) {
    console.error(`Kullanıcı veya bayi bulunamadı: ${ESRA_EMAIL}`);
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId } });
  const owner = resolveThyronixOwner({ ...user, dealerId: user.dealerId } as Parameters<typeof resolveThyronixOwner>[0]);
  const payload = buildBezosSourcePayload(dealer?.name || user.name || "Esra Güden");

  const existing = await prisma.thyronixSource.findFirst({
    where: {
      dealerId: user.dealerId,
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
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    console.log("✓ Bezos kaynağı oluşturuldu:", created.id, created.name);
  }

  console.log("\nFeed URL'leri:");
  console.log("  1.", "https://bezos.com.tr/xml-bayi/?xml=BAY%C4%B0%20XML&B2BXML=1");
  console.log("  2.", "https://www.bezos.com.tr/xml-bayi/?xml=BAY%C4%B0%20XML&B2BXML=1&OFFSET=50000");
  console.log("\nEşleştirme ekranı: /thyronix/connectors/bezos-bayi");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
