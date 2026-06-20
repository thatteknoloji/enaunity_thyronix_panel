/**
 * Lookup user by email in DB
 * Run: npx tsx scripts/lookup-user.ts esraguden840@gmail.com
 */
import { prisma } from "../src/lib/db";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npx tsx scripts/lookup-user.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  console.log("USER:", user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        company: user.company,
        createdAt: user.createdAt,
      }
    : null);

  const partial = await prisma.user.findMany({
    where: { email: { contains: email.split("@")[0] } },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    take: 10,
  });
  if (partial.length) console.log("PARTIAL_MATCHES:", partial);

  const partner = await prisma.partnerApplication.findFirst({
    where: { email: { contains: email.split("@")[0] } },
  });
  console.log("PARTNER_APP:", partner
    ? { id: partner.id, email: partner.email, status: partner.status, partnerType: partner.partnerType }
    : null);

  const counts = {
    users: await prisma.user.count({ where: { role: "user" } }),
    pending: await prisma.user.count({ where: { role: "user", status: "pending" } }),
    active: await prisma.user.count({ where: { role: "user", status: "active" } }),
  };
  console.log("COUNTS:", counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
