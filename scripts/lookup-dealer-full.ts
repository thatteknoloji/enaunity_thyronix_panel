/**
 * Full dealer + module license lookup
 * Run: npx tsx scripts/lookup-dealer-full.ts esraguden840@gmail.com
 */
import { prisma } from "../src/lib/db";
import { getModuleLicenseState } from "../src/lib/modules/access";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npx tsx scripts/lookup-dealer-full.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const partial = await prisma.user.findMany({
      where: { OR: [{ email: { contains: email.split("@")[0] } }, { name: { contains: email.split("@")[0] } }] },
      take: 10,
      select: { id: true, email: true, name: true, role: true, status: true, dealerId: true },
    });
    console.log("Kullanıcı bulunamadı.");
    if (partial.length) console.log("Benzer kayıtlar:", partial);
    return;
  }

  const dealer = user.dealerId
    ? await prisma.dealer.findUnique({ where: { id: user.dealerId } })
    : null;
  const approval = user.dealerId
    ? await prisma.dealerApproval.findUnique({ where: { dealerId: user.dealerId } })
    : null;
  const licenses = user.dealerId
    ? await prisma.moduleLicense.findMany({ where: { dealerId: user.dealerId }, orderBy: { createdAt: "desc" } })
    : [];
  const links = await prisma.productAccountLink.findMany({
    where: { enaUserId: user.id, status: { not: "DELETED" } },
    select: { productType: true, status: true, externalEmail: true, createdAt: true },
  });

  console.log("\n=== KULLANICI ===");
  console.log({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, dealerId: user.dealerId });

  if (dealer) {
    console.log("\n=== BAYİ ===");
    console.log({ id: dealer.id, name: dealer.name, company: dealer.company, email: dealer.email, status: dealer.status });
  }

  console.log("\n=== BAYİ ONAYI ===");
  console.log(approval || "Kayıt yok");

  console.log("\n=== MODÜL LİSANSLARI ===");
  for (const l of licenses) {
    const state = user.dealerId ? await getModuleLicenseState(user.dealerId, l.moduleKey) : "none";
    console.log({
      moduleKey: l.moduleKey,
      status: l.status,
      planKey: l.planKey,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
      lifecycleStage: l.lifecycleStage,
      effectiveAccess: state,
    });
  }
  if (!licenses.length) console.log("Lisans kaydı yok");

  console.log("\n=== ÜRÜN BAĞLANTILARI (THYRONIX/HIVE) ===");
  console.log(links.length ? links : "Bağlantı yok");

  console.log("\n=== GATEWAY TAHMİNİ ===");
  for (const mod of ["THYRONIX", "HIVE", "LINKSLASH"] as const) {
    const lic = licenses.find((l) => l.moduleKey === mod);
    const state = user.dealerId ? await getModuleLicenseState(user.dealerId, mod) : "none";
    let gateway = "dealer_required";
    if (!user.dealerId) gateway = "dealer_required";
    else if (state === "none") gateway = "pricing / ödeme";
    else if (state === "pending") gateway = "onay bekliyor";
    else if (state === "active") {
      const link = links.find((l) => l.productType === mod && l.status === "LINKED");
      gateway = mod === "LINKSLASH" ? "gateway/linkslash veya dealer/linkslash" : link ? "ürüne git (ready)" : "setup — hesap bağlama gerekli";
    }
    console.log(`${mod}: DB=${lic?.status || "YOK"}, effective=${state} → ${gateway}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
