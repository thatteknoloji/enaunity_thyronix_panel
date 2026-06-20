import fs from "fs";
import path from "path";
import { markdownToHtml } from "./markdown-to-html";

export type LegalPackageSeed = {
  title: string;
  slug: string;
  type: string;
  category: string;
  content: string;
  sourceFile: string;
};

const PACKAGE_DIR = path.join(process.cwd(), "content/legal");

const PACKAGE_MAP: Omit<LegalPackageSeed, "content" | "sourceFile">[] = [
  { title: "KVKK Aydınlatma Metni", slug: "kvkk-aydinlatma-metni", type: "public", category: "kvkk" },
  { title: "Açık Rıza Metni", slug: "acik-riza-metni", type: "public", category: "consent" },
  { title: "Çerez Politikası", slug: "cerez-politikasi", type: "public", category: "cookie" },
  { title: "Üyelik ve Platform Kullanım Sözleşmesi", slug: "uyelik-sozlesmesi", type: "public", category: "membership" },
  { title: "Bayilik, XML ve Dropshipping Hizmet Sözleşmesi", slug: "bayilik-xml-dropshipping-sozlesmesi", type: "dealer", category: "dealer" },
  { title: "HIVE ve THYRONIX Yazılım Hizmetleri Sözleşmesi", slug: "hive-thyronix-sozlesmesi", type: "module", category: "module" },
  { title: "İade, Değişim, Hasarlı Ürün ve Teslimat Politikası", slug: "iade-degisim-teslimat-politikasi", type: "public", category: "refund" },
  { title: "Gizlilik Politikası", slug: "gizlilik-politikasi", type: "public", category: "privacy" },
  { title: "Ticari Elektronik İleti Onayı", slug: "ticari-elektronik-ileti-onayi", type: "public", category: "commercial" },
];

const FILE_BY_SLUG: Record<string, string> = {
  "kvkk-aydinlatma-metni": "01_KVKK_Aydinlatma_Metni.md",
  "acik-riza-metni": "02_Acik_Riza_Metni.md",
  "cerez-politikasi": "03_Cerez_Politikasi.md",
  "uyelik-sozlesmesi": "04_Uyelik_ve_Platform_Kullanim_Sozlesmesi.md",
  "bayilik-xml-dropshipping-sozlesmesi": "05_Bayilik_XML_Dropshipping_Sozlesmesi.md",
  "hive-thyronix-sozlesmesi": "06_HIVE_THYRONIX_SaaS_Sozlesmesi.md",
  "iade-degisim-teslimat-politikasi": "07_Iade_Degisim_Teslimat_Politikasi.md",
  "gizlilik-politikasi": "08_Gizlilik_Politikasi.md",
  "ticari-elektronik-ileti-onayi": "09_Ticari_Elektronik_Ileti_Onayi.md",
};

function loadMarkdownContent(slug: string): string {
  const fileName = FILE_BY_SLUG[slug];
  if (!fileName) throw new Error(`Legal package file missing for slug: ${slug}`);
  const filePath = path.join(PACKAGE_DIR, fileName);
  const md = fs.readFileSync(filePath, "utf8");
  return markdownToHtml(md);
}

export function getLegalPackageSeeds(): LegalPackageSeed[] {
  return PACKAGE_MAP.map((meta) => {
    const sourceFile = FILE_BY_SLUG[meta.slug];
    return {
      ...meta,
      sourceFile,
      content: loadMarkdownContent(meta.slug),
    };
  });
}
