import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SitePageShell from "@/components/site/SitePageShell";
import PageRenderer from "@/components/site/PageRenderer";
import { normalizePageTemplate } from "@/lib/pages/types";

async function getFooterSettings() {
  const rows = await prisma.footerSettings.findMany();
  const data: Record<string, string> = {};
  rows.forEach((r) => { data[r.key] = r.value; });
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug, active: true }, select: { title: true } });
  if (!page) return { title: "Sayfa bulunamadı" };
  return { title: page.title };
}

export default async function CMSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({
    where: { slug, active: true },
  });

  if (!page) notFound();

  const template = normalizePageTemplate(page.template);
  const footerSettings = template === "contact" ? await getFooterSettings() : undefined;

  return (
    <SitePageShell title={page.title}>
      <PageRenderer
        template={template}
        content={page.content}
        contactSettings={
          footerSettings
            ? {
                contactEmail: footerSettings.contact_email,
                contactPhone: footerSettings.contact_phone,
                address: footerSettings.address,
              }
            : undefined
        }
      />
    </SitePageShell>
  );
}
