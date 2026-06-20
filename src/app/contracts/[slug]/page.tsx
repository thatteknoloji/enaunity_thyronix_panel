import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { contractProseClass } from "@/components/contracts/ContractsShell";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({ where: { slug }, select: { title: true, active: true } });
  if (!contract?.active) return { title: "Sözleşme bulunamadı" };
  return { title: contract.title };
}

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({ where: { slug } });

  if (!contract || !contract.active) notFound();

  return (
    <div className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${contractProseClass}`}
      dangerouslySetInnerHTML={{ __html: contract.content }}
    />
  );
}
