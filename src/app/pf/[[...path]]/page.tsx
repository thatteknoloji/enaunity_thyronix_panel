import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPageByPath } from "@/lib/page-factory/publish/page-publish-service";
import { PublishedPageRenderer } from "@/components/page-factory/PublishedPageRenderer";

type Props = { params: Promise<{ path?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path: segments } = await params;
  const page = await resolvePage(segments);
  if (!page) return { title: "Sayfa bulunamadı" };

  const noindex = page.robots.includes("noindex");
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function resolvePage(segments?: string[]) {
  if (!segments?.length) return null;
  const path = `/${segments.join("/")}`;
  return getPublishedPageByPath(path);
}

export default async function PublishedPagePreview({ params }: Props) {
  const { path: segments } = await params;
  const page = await resolvePage(segments);
  if (!page) notFound();

  return <PublishedPageRenderer page={page} />;
}
