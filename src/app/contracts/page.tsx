import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PUBLIC_CONTRACT_TYPES } from "@/lib/pages/public-contracts";

export default async function ContractsIndexPage() {
  const first = await prisma.contract.findFirst({
    where: { active: true, type: { in: [...PUBLIC_CONTRACT_TYPES] } },
    orderBy: [{ title: "asc" }],
    select: { slug: true },
  });

  if (first) redirect(`/contracts/${first.slug}`);
  redirect("/");
}
