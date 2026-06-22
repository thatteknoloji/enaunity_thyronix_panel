import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "LinkSlash Mobile",
  description: "LinkSlash — paylaşım menüsünden link kaydet, senkronize et.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d14",
};

export default function LinkSlashMobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-linkslash-mobile-shell="true" className="linkslash-mobile-shell min-h-dvh">
      <link rel="stylesheet" href="/linkslash/mobile/css/mobile.css" />
      <link rel="icon" href="/linkslash/icon192.png" type="image/png" />
      {children}
    </div>
  );
}
