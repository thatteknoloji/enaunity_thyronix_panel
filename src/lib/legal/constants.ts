/** Kayıt sırasında zorunlu sözleşmeler — her biri ayrı checkbox */
export const REGISTRATION_REQUIRED_SLUGS = [
  "kvkk-aydinlatma-metni",
  "gizlilik-politikasi",
  "cerez-politikasi",
  "uyelik-sozlesmesi",
] as const;

/** Kayıt sırasında opsiyonel */
export const REGISTRATION_OPTIONAL_SLUGS = ["ticari-elektronik-ileti-onayi"] as const;

/** Bayiye çevirme / bayi başvurusu öncesi zorunlu */
export const DEALER_REQUIRED_SLUGS = [
  "bayilik-xml-dropshipping-sozlesmesi",
  "iade-degisim-teslimat-politikasi",
] as const;

export const HIVE_PURCHASE_SLUG = "hive-thyronix-sozlesmesi";
export const THYRONIX_PURCHASE_SLUG = "hive-thyronix-sozlesmesi";

export type LegalContext =
  | "registration"
  | "dealer_apply"
  | "hive_purchase"
  | "thyronix_purchase"
  | "cookie_consent"
  | "reconsent";

export const LEGAL_CONTEXT_LABELS: Record<LegalContext, string> = {
  registration: "Üyelik kaydı",
  dealer_apply: "Bayi başvurusu",
  hive_purchase: "HIVE satın alma",
  thyronix_purchase: "THYRONIX satın alma",
  cookie_consent: "Çerez tercihi",
  reconsent: "Yeniden onay",
};

/** Üye checklist için (geriye uyumluluk) */
export const MEMBER_REQUIRED_LEGAL_SLUGS = [...REGISTRATION_REQUIRED_SLUGS] as const;
