import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPageBySlug } from "@/lib/page-factory/publish/page-publish-service";
import { PublishedPageRenderer } from "@/components/page-factory/PublishedPageRenderer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) return { title: "Sayfa bulunamadı" };

  const noindex = page.robots.includes("noindex");
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function PublishedPageBySlug({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();

  return <PublishedPageRenderer page={page} />;
}
