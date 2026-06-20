import { prisma } from "@/lib/db";
import { DEFAULT_PAGES } from "./default-content";
import { LEGAL_CONTRACT_SEEDS } from "@/lib/legal/seed-contracts";
import { upsertContractWithVersion } from "@/lib/legal/acceptance";

export type SiteContentSeedResult = {
  pages: number;
  contracts: number;
  footerKeys: number;
  pageSlugs: string[];
  contractSlugs: string[];
};

/** Idempotent: sayfalar + versiyonlu sözleşmeler + footer */
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
  for (const contract of LEGAL_CONTRACT_SEEDS) {
    await upsertContractWithVersion(contract);
    contractSlugs.push(contract.slug);
  }

  const footerDefaults = [
    {
      key: "about_intro",
      value:
        "E-ticarete girişin en kolay yolu. Dropshipping, XML Bayilik ve Stoksuz E-Ticaret ile binlerce ürüne tek merkezden ulaşın.",
    },
    { key: "contact_email", value: "info@enaunity.com.tr" },
    { key: "contact_phone", value: "0541 188 14 35" },
    {
      key: "address",
      value:
        "Akdeniz Mahallesi Şehit Fethi Bey Caddesi Kızılkanat İş Merkezi No:45 Kat:8 Daire:83\nKonak / İzmir",
    },
  ];

  for (const item of footerDefaults) {
    await prisma.footerSettings.upsert({
      where: { key: item.key },
      update: { value: item.value },
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
