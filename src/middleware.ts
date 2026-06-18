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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

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

  // ── Product Gateway (ENA session required) ──
  if (pathname.startsWith("/gateway")) {
    const token = request.cookies.get("token")?.value;
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

  const token = request.cookies.get("token")?.value;

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
    // Platform admin: ENA token yeterli, thyronix_ok gerekmez
    if (token && payload && isAdminRole(role)) return NextResponse.next();

    const thyronixOk = request.cookies.get("thyronix_ok")?.value;
    if (!thyronixOk) {
      const redirect = new URL("/thyronix/login", request.url);
      redirect.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirect);
    }
    if (isAdminRole(role)) return NextResponse.next();
    // Dealer: check license via internal API
    const dealerId = (payload as any).dealerId;
    if (dealerId) {
      try {
        const checkRes = await fetch(`${request.nextUrl.origin}/api/internal/check-module-access?dealerId=${dealerId}&moduleKey=THYRONIX`);
        const checkData = await checkRes.json();
        if (!checkData.access) {
          if (checkData.reason === "LISANS_YOK") return NextResponse.redirect(new URL("/thyronix/pricing", request.url));
          return NextResponse.redirect(new URL("/thyronix/pending", request.url));
        }
        return NextResponse.next();
      } catch { return NextResponse.redirect(new URL("/thyronix/pricing", request.url)); }
    }
    if (isApi) return jsonError(403, "Yetkisiz erişim");
    return NextResponse.redirect(new URL("/thyronix/login", request.url));
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
          if (checkData.reason === "LISANS_YOK") return NextResponse.redirect(new URL("/hive/pricing", request.url));
          return NextResponse.redirect(new URL("/hive/pending", request.url));
        }
        return NextResponse.next();
      } catch { return NextResponse.redirect(new URL("/hive/pricing", request.url)); }
    }
    return NextResponse.redirect(new URL("/hive/pricing", request.url));
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
    if (role !== "dealer" && role !== "admin") return jsonError(403, "Yetkisiz erişim");
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
    if (role !== "dealer" && role !== "admin") return jsonError(403, "Yetkisiz erişim");
    return NextResponse.next();
  }

  if (isAccountPage || isDealerPage || isProductLibraryPage || isDealerApi) {
    if (role !== "dealer" && role !== "admin") {
      if (isApi) return jsonError(403, "Yetkisiz erişim");
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/thyronix", "/thyronix/:path*", "/hive", "/hive/:path*", "/gateway", "/gateway/:path*", "/nexa", "/nexa/:path*", "/x-control-eu-7294", "/x-control-eu-7294/:path*", "/account", "/account/:path*", "/dealer", "/dealer/:path*", "/product-library", "/product-library/:path*", "/api/dealer/:path*", "/api/admin/:path*", "/api/thyronix/:path*", "/api/nexa/:path*", "/api/product-library", "/api/product-library/:path*", "/api/fulfillment", "/api/fulfillment/:path*", "/api/my", "/api/my/:path*", "/api/marketplace-hub", "/api/marketplace-hub/:path*", "/api/product-links", "/api/product-links/:path*", "/api/product-auth/:path*", "/api/gateway/:path*", "/login", "/giris"],
};
