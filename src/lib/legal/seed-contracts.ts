import { getLegalPackageSeeds, type LegalPackageSeed } from "./package-content";

export type LegalContractSeed = LegalPackageSeed;

/** Tam metinler content/legal/*.md dosyalarından yüklenir */
export const LEGAL_CONTRACT_SEEDS: LegalContractSeed[] = [
  ...getLegalPackageSeeds(),
  {
    title: "Mesafeli Satış Sözleşmesi",
    slug: "mesafeli-satis-sozlesmesi",
    type: "public",
    category: "legacy",
    sourceFile: "legacy",
    content:
      "<h2>Mesafeli Satış Sözleşmesi</h2><p>6502 sayılı Kanun kapsamında düzenlenmiştir. Güncel metin için Üyelik Sözleşmesi ve İade Politikası geçerlidir.</p>",
  },
  {
    title: "Bayi / Tedarikçi Sözleşmesi",
    slug: "bayi-sozlesmesi",
    type: "dealer",
    category: "legacy",
    sourceFile: "legacy",
    content:
      "<h2>Bayi Sözleşmesi</h2><p>Güncel metin için Bayilik, XML ve Dropshipping Hizmet Sözleşmesi geçerlidir.</p>",
  },
];

// Geriye uyumluluk — eski importlar
export {
  getLegalPackageSeeds,
};
