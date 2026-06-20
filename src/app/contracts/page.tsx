import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sortContractsByLegalOrder } from "@/lib/legal/package-content";

export default async function ContractsIndexPage() {
  const rows = await prisma.contract.findMany({
    where: { active: true },
    select: { slug: true },
  });
  const first = sortContractsByLegalOrder(rows)[0];

  if (first) redirect(`/contracts/${first.slug}`);
  redirect("/");
}
