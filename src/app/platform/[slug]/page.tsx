import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getShowcaseBySlug } from "@/lib/ecosystem/service";
import { getPlatformContent } from "@/lib/ecosystem/platform-content";
import { mergePlatformWithShowcase } from "@/lib/ecosystem/merge-platform-content";
import { PlatformLanding } from "@/components/ecosystem/PlatformLanding";
import { ShowcaseLanding } from "@/components/ecosystem/ShowcaseLanding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const showcase = await getShowcaseBySlug(slug);
  const staticContent = getPlatformContent(slug);
  if (showcase) {
    return {
      title: showcase.heroTitle || showcase.name,
      description: showcase.heroDescription || showcase.shortDescription,
    };
  }
  if (!staticContent) return { title: "Platform" };
  return {
    title: `${staticContent.name} — ${staticContent.subtitle}`,
    description: staticContent.description,
  };
}

export default async function PlatformPage({ params }: Props) {
  const { slug } = await params;
  const showcase = await getShowcaseBySlug(slug);
  const staticContent = getPlatformContent(slug);

  if (staticContent && showcase) {
    return <PlatformLanding content={mergePlatformWithShowcase(staticContent, showcase)} />;
  }
  if (showcase) {
    return <ShowcaseLanding product={showcase} />;
  }
  if (staticContent) {
    return <PlatformLanding content={staticContent} />;
  }
  notFound();
}
