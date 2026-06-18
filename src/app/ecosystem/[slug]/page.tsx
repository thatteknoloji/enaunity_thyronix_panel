import { notFound } from "next/navigation";
import { getShowcaseBySlug } from "@/lib/ecosystem/service";
import { ShowcaseLanding } from "@/components/ecosystem/ShowcaseLanding";

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
  const product = await getShowcaseBySlug(slug);
  if (!product) notFound();
  return <ShowcaseLanding product={product} />;
}
