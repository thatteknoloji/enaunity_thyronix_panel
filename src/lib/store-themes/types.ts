export type StoreThemeColors = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerBg: string;
  footerBg: string;
  cardBg: string;
  buttonStyle: "rounded" | "pill" | "sharp";
};

export type StoreThemeFonts = {
  headingFont: string;
  bodyFont: string;
};

export type StoreThemeLayout = {
  headerStyle: "default" | "center" | "minimal";
  footerStyle: "default" | "minimal" | "center";
  cardStyle: "bordered" | "elevated" | "flat";
  bannerHeight: "small" | "medium" | "large";
  bannerOverlay: boolean;
};

export type StoreThemeNavLink = {
  label: string;
  href: string;
  order: number;
};

export type StoreThemeFooterGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export type StoreThemeSocialLink = {
  platform: string;
  url: string;
};

export type StoreThemeBanner = {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
};

export type StoreThemeSeo = {
  title: string;
  description: string;
};

export type StoreTheme = {
  name: string;
  label: string;
  description: string;
  previewColor: string;
  colors: StoreThemeColors;
  fonts: StoreThemeFonts;
  layout: StoreThemeLayout;
  headerLinks: StoreThemeNavLink[];
  footerGroups: StoreThemeFooterGroup[];
  socialLinks: StoreThemeSocialLink[];
  banner: StoreThemeBanner;
  seo: StoreThemeSeo;
};
