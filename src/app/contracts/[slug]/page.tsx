import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contract = await prisma.contract.findUnique({ where: { slug } });

  if (!contract || !contract.active) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ena-text">Sayfa bulunamadı</h1>
        <Link href="/" className="text-ena-primary hover:underline mt-4 inline-block">Ana sayfaya dön</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-8">
        <ChevronLeft size={16} /> Ana Sayfa
      </Link>
      <h1 className="text-3xl font-bold text-ena-text mb-8">{contract.title}</h1>
      <div className="prose prose-invert max-w-none text-ena-light leading-relaxed"
        dangerouslySetInnerHTML={{ __html: contract.content }} />
    </div>
  );
}
