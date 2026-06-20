import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { sitePolicyProseClass } from "@/components/site/SitePageShell";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({ where: { slug }, select: { title: true, active: true } });
  if (!contract?.active) return { title: "Sözleşme bulunamadı" };
  return { title: contract.title };
}

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({
    where: { slug },
    include: { versions: { where: { isActive: true }, orderBy: { version: "desc" }, take: 1 } },
  });

  if (!contract || !contract.active) notFound();

  const content = contract.versions[0]?.content || contract.content;

  return (
    <article>
      <header className="mb-6 border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-ena-text md:text-3xl">{contract.title}</h2>
        {contract.publishedAt ? (
          <p className="mt-2 text-xs text-ena-light/60">
            Son güncelleme: {new Date(contract.publishedAt).toLocaleDateString("tr-TR")}
          </p>
        ) : null}
      </header>
      <div
        className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${sitePolicyProseClass}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}
