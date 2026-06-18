import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlatformContent } from "@/lib/ecosystem/platform-content";
import { PlatformLanding } from "@/components/ecosystem/PlatformLanding";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = getPlatformContent(slug);
  if (!content) return { title: "Platform" };
  return {
    title: `${content.name} — ${content.subtitle}`,
    description: content.description,
  };
}

export default async function PlatformPage({ params }: Props) {
  const { slug } = await params;
  const content = getPlatformContent(slug);
  if (!content) notFound();
  return <PlatformLanding content={content} />;
}
