/** LinkSlash APK / mobil WebView — izole shell rotaları (ana site layout dışı) */

export const LINKSLASH_MOBILE_BASE = "/linkslash/mobile";

export const LINKSLASH_MOBILE_ROUTES = {
  root: LINKSLASH_MOBILE_BASE,
  login: `${LINKSLASH_MOBILE_BASE}/login`,
  dashboard: `${LINKSLASH_MOBILE_BASE}/dashboard`,
  license: `${LINKSLASH_MOBILE_BASE}/license`,
  device: `${LINKSLASH_MOBILE_BASE}/device`,
  update: `${LINKSLASH_MOBILE_BASE}/update`,
  import: `${LINKSLASH_MOBILE_BASE}/import`,
  whatsapp: `${LINKSLASH_MOBILE_BASE}/whatsapp`,
  records: `${LINKSLASH_MOBILE_BASE}/records`,
} as const;

export function isLinkSlashMobilePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0]?.replace(/\/$/, "") || "";
  return p === LINKSLASH_MOBILE_BASE || p.startsWith(`${LINKSLASH_MOBILE_BASE}/`);
}

export function isLinkSlashMobileStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith(`${LINKSLASH_MOBILE_BASE}/css/`) ||
    pathname.startsWith(`${LINKSLASH_MOBILE_BASE}/js/`) ||
    pathname === `${LINKSLASH_MOBILE_BASE}/manifest.json`
  );
}
