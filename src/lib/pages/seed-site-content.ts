import { prisma } from "@/lib/db";
import { DEFAULT_CONTRACTS, DEFAULT_PAGES } from "./default-content";

export type SiteContentSeedResult = {
  pages: number;
  contracts: number;
  footerKeys: number;
  pageSlugs: string[];
  contractSlugs: string[];
};

/** Idempotent: SSS, kargo, iletişim sayfaları + public sözleşmeler + footer varsayılanları */
export async function seedSiteContent(): Promise<SiteContentSeedResult> {
  const pageSlugs: string[] = [];
  for (const page of DEFAULT_PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        template: page.template,
        content: page.content,
        order: page.order,
        active: true,
      },
      create: {
        title: page.title,
        slug: page.slug,
        template: page.template,
        content: page.content,
        order: page.order,
        active: true,
      },
    });
    pageSlugs.push(page.slug);
  }

  const contractSlugs: string[] = [];
  for (const contract of DEFAULT_CONTRACTS) {
    await prisma.contract.upsert({
      where: { slug: contract.slug },
      update: {
        title: contract.title,
        type: contract.type,
        content: contract.content,
        active: true,
      },
      create: {
        title: contract.title,
        slug: contract.slug,
        type: contract.type,
        content: contract.content,
        active: true,
      },
    });
    contractSlugs.push(contract.slug);
  }

  const footerDefaults = [
    {
      key: "about_intro",
      value:
        "E-ticarete girişin en kolay yolu. Dropshipping, XML Bayilik ve Stoksuz E-Ticaret ile binlerce ürüne tek merkezden ulaşın.",
    },
    { key: "contact_email", value: "info@enaunity.com" },
    { key: "contact_phone", value: "+90 (212) 555 00 00" },
    { key: "address", value: "Maslak Mah. Büyükdere Cad. No:1\nSarıyer / İstanbul" },
  ];

  for (const item of footerDefaults) {
    await prisma.footerSettings.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
  }

  return {
    pages: pageSlugs.length,
    contracts: contractSlugs.length,
    footerKeys: footerDefaults.length,
    pageSlugs,
    contractSlugs,
  };
}
