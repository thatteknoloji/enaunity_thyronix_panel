import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPPORT", "ACCOUNTING", "WAREHOUSE"];
function isAdminRole(role: string) { return ADMIN_ROLES.includes(role?.toUpperCase()); }

async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    const secret = process.env.JWT_SECRET || "fallback-secret";
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** LinkSlash bayi erişimi — lisanssız → tanıtım sayfası */
async function guardLinkSlashDealerAccess(
  request: NextRequest,
  dealerId: string
): Promise<NextResponse | null> {
  try {
    const checkRes = await fetch(
      `${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerId}&moduleKey=LINKSLASH`
    );
    const checkData = await checkRes.json();
    if (checkData.access) return null;
    if (checkData.reason === "BAYI_ONAYI_YOK") {
      return NextResponse.redirect(new URL("/dealer/profile", request.url));
    }
    return NextResponse.redirect(new URL("/platform/linkslash", request.url));
  } catch {
    return NextResponse.redirect(new URL("/platform/linkslash", request.url));
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get("token")?.value;

  // ── Redirect old /nexa/* to /thyronix/* ──
  if (pathname.startsWith("/nexa/") || pathname === "/nexa") {
    const newPath = pathname.replace("/nexa", "/thyronix");
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }
  if (pathname.startsWith("/api/nexa/")) {
    const newPath = pathname.replace("/api/nexa", "/api/thyronix");
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }

  // ── Public feed output endpoints (no auth required) ──
  if (pathname.startsWith("/api/thyronix/feed/") && /\/output\.(xml|csv|xlsx|json)/.test(pathname)) {
    return NextResponse.next();
  }
  if (pathname === "/api/thyronix/stats/public") {
    return NextResponse.next();
  }

  // ── Admin route masking ──
  const adminSecret = process.env.ADMIN_SECRET_PATH || "/x-control-eu-7294";
  // Block direct /admin access (except secret path)
  if (pathname.startsWith("/admin") && !pathname.startsWith(adminSecret)) {
    if (isApi) return jsonError(404, "Bulunamadı");
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Allow secret path to pass through (will be checked for role later)
  if (pathname.startsWith(adminSecret)) {
    // Strip secret prefix for internal routing
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = pathname.replace(adminSecret, "/admin");
    return NextResponse.rewrite(rewritten);
  }

  if (pathname === "/login" || pathname === "/giris") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // ── Affiliate referral (?ref=ENA-XXXXXX) — cookie + VISIT kaydı ──
  const refCode = request.nextUrl.searchParams.get("ref");
  const isReferralLanding =
    refCode &&
    !isApi &&
    (pathname === "/" ||
      pathname === "/linkslash" ||
      pathname.startsWith("/platform/") ||
      pathname.startsWith("/products/"));

  if (isReferralLanding) {
    try {
      const trackRes = await fetch(`${request.nextUrl.origin}/api/internal/track-referral`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          referralCode: refCode,
          landingPath: pathname,
          sourceUrl: request.url,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "",
          userAgent: request.headers.get("user-agent") || "",
        }),
      });
      const res = NextResponse.next();
      if (trackRes.ok) {
        res.cookies.set("ena_ref", refCode.toUpperCase(), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
      }
      return res;
    } catch {
      // devam et
    }
  }

  // /r/{slug} route handler tarafından işlenir
  if (pathname.startsWith("/r/")) {
    return NextResponse.next();
  }

  // ── Block direct public APK downloads (license-gated API only) ──
  if (/^\/downloads\/linkslash\/.*\.apk$/i.test(pathname)) {
    if (isApi) {
      return jsonError(403, "APK indirme lisanslı kullanıcılar içindir. /api/linkslash/download/android kullanın.");
    }
    const blocked = request.nextUrl.clone();
    blocked.pathname = "/linkslash/downloads";
    blocked.searchParams.set("blocked", "apk");
    return NextResponse.redirect(blocked);
  }

  // ── Public LinkSlash marketing (no auth) ──
  if (pathname === "/linkslash" || pathname.startsWith("/linkslash/downloads")) {
    return NextResponse.next();
  }

  // ── LinkSlash static app (SPA assets) — lisans gerekli ──
  if (
    pathname.startsWith("/linkslash/") &&
    pathname !== "/linkslash" &&
    !pathname.startsWith("/linkslash/page") &&
    !pathname.startsWith("/linkslash/mobile") &&
    !pathname.startsWith("/linkslash/downloads")
  ) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const payloadLs = await verifyJWT(token);
    if (!payloadLs) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (isAdminRole((payloadLs.role as string) || "")) return NextResponse.next();
    const dealerIdLs = (payloadLs as { dealerId?: string }).dealerId;
    if (dealerIdLs) {
      const blocked = await guardLinkSlashDealerAccess(request, dealerIdLs);
      if (blocked) return blocked;
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/gateway/linkslash", request.url));
  }

  // ── LinkSlash dealer route ──
  if (pathname.startsWith("/dealer/linkslash")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const payloadLs = await verifyJWT(token);
    if (!payloadLs) return NextResponse.redirect(new URL("/auth/login", request.url));
    if (isAdminRole((payloadLs.role as string) || "")) return NextResponse.next();
    const dealerIdLs = (payloadLs as { dealerId?: string }).dealerId;
    if (dealerIdLs) {
      const blocked = await guardLinkSlashDealerAccess(request, dealerIdLs);
      if (blocked) return blocked;
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/gateway/linkslash", request.url));
  }

  // ── POD Creator dealer route ──
  if (pathname.startsWith("/dealer/pod")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const payloadPod = await verifyJWT(token);
    if (!payloadPod) return NextResponse.redirect(new URL("/auth/login", request.url));
    if (isAdminRole((payloadPod.role as string) || "")) return NextResponse.next();
    const dealerIdPod = (payloadPod as { dealerId?: string }).dealerId;
    if (dealerIdPod) {
      try {
        const checkRes = await fetch(
          `${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerIdPod}&moduleKey=POD_CREATOR`
        );
        const checkData = await checkRes.json();
        if (!checkData.access) {
          if (checkData.reason === "LISANS_YOK") {
            return NextResponse.redirect(new URL("/gateway/pod", request.url));
          }
          return NextResponse.redirect(new URL("/gateway/pod", request.url));
        }
      } catch {
        return NextResponse.redirect(new URL("/gateway/pod", request.url));
      }
    }
    return NextResponse.next();
  }

  // ── AI Page Factory dealer route ──
  if (pathname.startsWith("/dealer/page-factory")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const payloadPf = await verifyJWT(token);
    if (!payloadPf) return NextResponse.redirect(new URL("/auth/login", request.url));
    if (isAdminRole((payloadPf.role as string) || "")) return NextResponse.next();
    const dealerIdPf = (payloadPf as { dealerId?: string }).dealerId;
    if (dealerIdPf) {
      try {
        const checkRes = await fetch(
          `${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerIdPf}&moduleKey=AI_PAGE_FACTORY`
        );
        const checkData = await checkRes.json();
        if (!checkData.access) {
          return NextResponse.redirect(new URL("/gateway/page-factory", request.url));
        }
      } catch {
        return NextResponse.redirect(new URL("/gateway/page-factory", request.url));
      }
    }
    return NextResponse.next();
  }

  // ── Product Gateway (ENA session required) ──
  if (pathname.startsWith("/gateway")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // API key auth for dealer API routes
  if (pathname.startsWith("/api/dealer/")) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey) {
      try {
        const origin = request.nextUrl.origin;
        const verifyRes = await fetch(`${origin}/api/internal/verify-api-key`, {
          method: "POST",
          headers: { "x-api-key": apiKey, "content-type": "application/json" },
        });
        if (!verifyRes.ok) {
          const body = await verifyRes.json();
          if (verifyRes.status === 429) {
            return NextResponse.json(body, {
              status: 429,
              headers: { "Retry-After": String(body.retryAfter || 60) },
            });
          }
          return NextResponse.json(body, { status: verifyRes.status });
        }

        const { data } = await verifyRes.json();
        const requestHeaders = new Headers(request.headers);
        if (data.dealerId) requestHeaders.set("x-dealer-id", data.dealerId);
        requestHeaders.set("x-api-key-id", data.keyId);
        requestHeaders.set("x-api-key-name", data.name);

        return NextResponse.next({ request: { headers: requestHeaders } });
      } catch {
        return jsonError(500, "Kimlik doğrulama hatası");
      }
    }
  }

  // LinkSlash session probe — oturumsuz erişim (extension auth kontrolü)
  if (pathname === "/api/linkslash/session" && request.method === "GET") {
    return NextResponse.next();
  }
  // LinkSlash version — public
  if (pathname === "/api/linkslash/version" && request.method === "GET") {
    return NextResponse.next();
  }
  // LinkSlash token-based APK download — token doğrulaması route içinde
  if (/^\/api\/linkslash\/download\/[a-f0-9]{20,}$/i.test(pathname) && request.method === "GET") {
    return NextResponse.next();
  }
  // LinkSlash download status — public
  if (pathname === "/api/linkslash/downloads/status" && request.method === "GET") {
    return NextResponse.next();
  }

  if (!token) {
    if (isApi) return jsonError(401, "Oturum bulunamadı");
    if (pathname === "/thyronix/login") return NextResponse.next();
    const loginUrl = new URL(pathname.startsWith("/thyronix") ? "/thyronix/login" : "/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    if (isApi) return jsonError(401, "Geçersiz oturum");
    const res = NextResponse.redirect(new URL("/auth/login", request.url));
    res.cookies.delete("token");
    return res;
  }

  const role = (payload.role as string) || "";

  // ── THYRONIX route protection ──
  if (pathname.startsWith("/thyronix") && pathname !== "/thyronix/login" && !pathname.startsWith("/thyronix/pricing") && !pathname.startsWith("/thyronix/pending")) {
    if (token && payload && isAdminRole(role)) return NextResponse.next();

    const dealerId = (payload as any).dealerId;
    // Lisanslı bayi: ENA oturumu yeterli — ayrı thyronix_ok cookie zorunlu değil
    if (dealerId) {
      try {
        const checkRes = await fetch(`${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerId}&moduleKey=THYRONIX`);
        const checkData = await checkRes.json();
        if (checkData.access) return NextResponse.next();
        if (checkData.reason === "LISANS_YOK") {
          return NextResponse.redirect(new URL("/platform/thyronix", request.url));
        }
        return NextResponse.redirect(new URL("/thyronix/pending", request.url));
      } catch {
        return NextResponse.next();
      }
    }

    const thyronixOk = request.cookies.get("thyronix_ok")?.value;
    if (thyronixOk) return NextResponse.next();

    const redirect = new URL("/thyronix/login", request.url);
    redirect.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirect);
  }

  // ── HIVE route protection ──
  if (pathname.startsWith("/hive") && !pathname.startsWith("/hive/login") && !pathname.startsWith("/hive/pricing") && !pathname.startsWith("/hive/pending")) {
    if (token && payload && isAdminRole(role)) return NextResponse.next();
    const hiveOk = request.cookies.get("hive_ok")?.value;
    if (hiveOk) return NextResponse.next();
    const dealerId = (payload as any).dealerId;
    if (dealerId) {
      try {
        const checkRes = await fetch(`${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerId}&moduleKey=HIVE`);
        const checkData = await checkRes.json();
        if (!checkData.access) {
          if (checkData.reason === "LISANS_YOK") return NextResponse.redirect(new URL("/platform/hive", request.url));
          return NextResponse.redirect(new URL("/hive/pending", request.url));
        }
        return NextResponse.next();
      } catch { return NextResponse.next(); }
    }
    return NextResponse.redirect(new URL("/platform/hive", request.url));
  }

  // ── Admin route protection ──
  if (pathname.startsWith("/admin")) {
    if (!isAdminRole(role)) {
      if (isApi) return jsonError(403, "Yetkisiz erişim");
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const isAccountPage = pathname.startsWith("/account");
  const isDealerPage = pathname.startsWith("/dealer") && !pathname.startsWith("/api/");
  const isProductLibraryPage = pathname.startsWith("/product-library");
  const isDealerApi = pathname.startsWith("/api/dealer/");
  const isAiPartnerApi = pathname.startsWith("/api/ai-partner/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isProductLibraryApi = pathname.startsWith("/api/product-library/");
  const isThyronixApi = pathname.startsWith("/api/thyronix/");
  const thyronixAdminOnlyPrefixes = [
    "/api/thyronix/snapshots",
    "/api/thyronix/rollback",
    "/api/thyronix/demo-seed",
    "/api/thyronix/dashboard/history",
    "/api/thyronix/ai/",
  ];

  if (isThyronixApi) {
    const isAdmin = isAdminRole(role) || role === "admin";
    const isDealer = role === "dealer";
    if (!isAdmin && !isDealer) return jsonError(403, "Yetkisiz erişim");
    if (!isAdmin && thyronixAdminOnlyPrefixes.some((p) => pathname.startsWith(p))) {
      return jsonError(403, "Yetkisiz erişim");
    }
    return NextResponse.next();
  }

  if (isAdminApi) {
    if (!isAdminRole(role)) return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  if (isAiPartnerApi) {
    if (role !== "dealer" && !isAdminRole(role)) return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  if (isProductLibraryApi) {
    const isAdmin = isAdminRole(role) || role === "admin";
    const isDealer = role === "dealer";
    const adminOnlyPrefixes = [
      "/api/product-library/dashboard",
      "/api/product-library/suppliers",
      "/api/product-library/import/",
      "/api/product-library/items",
      "/api/product-library/import-jobs",
      "/api/product-library/access",
    ];
    const dealerAllowed = [
      "/api/product-library/my-packages",
      "/api/product-library/catalogs",
      "/api/product-library/purchase",
      "/api/product-library/distribution-logs",
    ];
    const isPackageRoute = pathname.startsWith("/api/product-library/package/");
    if (!isAdmin && !isDealer) return jsonError(403, "Yetkisiz erişim");
    if (!isAdmin) {
      if (adminOnlyPrefixes.some((p) => pathname.startsWith(p))) return jsonError(403, "Yetkisiz erişim");
      if (pathname === "/api/product-library/packages" && request.method !== "GET") return jsonError(403, "Yetkisiz erişim");
      if (!dealerAllowed.includes(pathname) && !isPackageRoute) return jsonError(403, "Yetkisiz erişim");
    }
    return NextResponse.next();
  }

  const isFulfillmentApi = pathname.startsWith("/api/fulfillment/");
  const isMyApi = pathname.startsWith("/api/my/");

  if (isFulfillmentApi) {
    if (!isAdminRole(role) && role !== "admin") return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  if (isMyApi) {
    if (role !== "dealer" && !isAdminRole(role)) return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  const isLinkSlashApi = pathname.startsWith("/api/linkslash/");
  if (isLinkSlashApi) {
    if (pathname === "/api/linkslash/session" && request.method === "GET") {
      return NextResponse.next();
    }
    if (pathname === "/api/linkslash/version" && request.method === "GET") {
      return NextResponse.next();
    }
    if (/^\/api\/linkslash\/download\/[a-f0-9]{20,}$/i.test(pathname) && request.method === "GET") {
      return NextResponse.next();
    }
    if (pathname === "/api/linkslash/downloads/status" && request.method === "GET") {
      return NextResponse.next();
    }
    if (pathname === "/api/linkslash/mobile/activate" && request.method === "POST") {
      if (!token) return jsonError(401, "Oturum bulunamadı");
      return NextResponse.next();
    }
    if (!token) return jsonError(401, "Oturum bulunamadı");
    const payloadLs = await verifyJWT(token);
    if (!payloadLs) return jsonError(401, "Geçersiz oturum");
    if (!isAdminRole((payloadLs.role as string) || "")) {
      const dealerIdLs = (payloadLs as { dealerId?: string }).dealerId;
      if (!dealerIdLs) return jsonError(403, "Yetkisiz erişim");
      try {
        const checkRes = await fetch(
          `${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerIdLs}&moduleKey=LINKSLASH`
        );
        const checkData = await checkRes.json();
        if (!checkData.access) return jsonError(403, checkData.reason || "LinkSlash lisansı gerekli");
      } catch {
        return jsonError(403, "LinkSlash lisans kontrolü başarısız");
      }
    }
    return NextResponse.next();
  }

  const isMarketplaceHubApi = pathname.startsWith("/api/marketplace-hub");
  if (isMarketplaceHubApi) {
    if (pathname.startsWith("/api/marketplace-hub/webhooks")) return NextResponse.next();
    if (!isAdminRole(role) && role !== "admin") return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  const isDealerMarketplaceHubApi = pathname.startsWith("/api/dealer/marketplace-hub");
  if (isDealerMarketplaceHubApi) {
    if (role !== "dealer" && !isAdminRole(role)) return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  if (isAccountPage || isDealerPage || isProductLibraryPage || isDealerApi) {
    if (role !== "dealer" && !isAdminRole(role)) {
      if (isApi) return jsonError(403, "Yetkisiz erişim");
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/thyronix", "/thyronix/:path*", "/hive", "/hive/:path*", "/gateway", "/gateway/:path*", "/linkslash", "/linkslash/:path*", "/nexa", "/nexa/:path*", "/x-control-eu-7294", "/x-control-eu-7294/:path*", "/account", "/account/:path*", "/dealer", "/dealer/:path*", "/product-library", "/product-library/:path*", "/api/dealer/:path*", "/api/admin/:path*", "/api/ai-partner/:path*", "/api/thyronix/:path*", "/api/nexa/:path*", "/api/product-library", "/api/product-library/:path*", "/api/fulfillment", "/api/fulfillment/:path*", "/api/my", "/api/my/:path*", "/api/marketplace-hub", "/api/marketplace-hub/:path*", "/api/product-links", "/api/product-links/:path*", "/api/product-auth/:path*", "/api/gateway/:path*", "/api/linkslash/:path*", "/login", "/giris", "/r/:path*", "/", "/platform/:path*", "/products/:path*"],
};
