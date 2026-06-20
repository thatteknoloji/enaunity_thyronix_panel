import { prisma } from "@/lib/db";
import { PUBLIC_CONTRACT_TYPES } from "@/lib/pages/public-contracts";
import ContractsShell from "@/components/contracts/ContractsShell";

async function getContracts() {
  return prisma.contract.findMany({
    where: { active: true, type: { in: [...PUBLIC_CONTRACT_TYPES] } },
    orderBy: [{ title: "asc" }],
    select: { id: true, slug: true, title: true },
  });
}

export default async function ContractsLayout({ children }: { children: React.ReactNode }) {
  const contracts = await getContracts();
  return <ContractsShell contracts={contracts}>{children}</ContractsShell>;
}
