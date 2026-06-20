import { prisma } from "@/lib/db";
import { PUBLIC_CONTRACT_TYPES } from "@/lib/pages/public-contracts";
import { sortContractsByLegalOrder } from "@/lib/legal/package-content";
import ContractsShell from "@/components/contracts/ContractsShell";

async function getContracts() {
  const rows = await prisma.contract.findMany({
    where: { active: true, type: { in: [...PUBLIC_CONTRACT_TYPES, "dealer", "module"] } },
    select: { id: true, slug: true, title: true },
  });
  return sortContractsByLegalOrder(rows);
}

export default async function ContractsLayout({ children }: { children: React.ReactNode }) {
  const contracts = await getContracts();
  return <ContractsShell contracts={contracts}>{children}</ContractsShell>;
}
