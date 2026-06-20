import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import SitePageShell, { siteProseClass } from "@/components/site/SitePageShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sözleşmeler",
};

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({ where: { slug } });

  if (!contract || !contract.active) {
    return (
      <SitePageShell title="Sayfa bulunamadı">
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <FileText size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-4 text-ena-light">Aradığınız sözleşme bulunamadı veya yayından kaldırılmış.</p>
          <Link href="/contracts" className="mt-4 inline-block text-sm text-ena-primary hover:underline">
            Tüm sözleşmelere dön
          </Link>
        </div>
      </SitePageShell>
    );
  }

  return (
    <SitePageShell title={contract.title} backHref="/contracts" backLabel="Sözleşmeler">
      <div className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${siteProseClass}`}
        dangerouslySetInnerHTML={{ __html: contract.content }}
      />
    </SitePageShell>
  );
}
