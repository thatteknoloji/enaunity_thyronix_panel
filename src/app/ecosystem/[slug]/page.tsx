import { notFound } from "next/navigation";
import { getShowcaseBySlug } from "@/lib/ecosystem/service";
import { getPlatformContent } from "@/lib/ecosystem/platform-content";
import { mergePlatformWithShowcase } from "@/lib/ecosystem/merge-platform-content";
import { ShowcaseLanding } from "@/components/ecosystem/ShowcaseLanding";
import { PlatformLanding } from "@/components/ecosystem/PlatformLanding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getShowcaseBySlug(slug);
  if (!product) return { title: "Ürün Bulunamadı" };
  return {
    title: product.heroTitle || product.name,
    description: product.heroDescription || product.shortDescription,
  };
}

export default async function EcosystemProductPage({ params }: Props) {
  const { slug } = await params;
  const showcase = await getShowcaseBySlug(slug);
  const staticContent = getPlatformContent(slug);

  if (staticContent && showcase) {
    return <PlatformLanding content={mergePlatformWithShowcase(staticContent, showcase)} />;
  }
  if (showcase) {
    return <ShowcaseLanding product={showcase} />;
  }
  notFound();
}
