import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { getAdminSecretPath, isAdminRole } from "@/lib/auth/admin-access";
import type { User } from "@prisma/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/google/callback`;

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

function getPostLoginPath(user: Pick<User, "role" | "status" | "dealerId">): string {
  if (isAdminRole(user.role)) return getAdminSecretPath();
  if (user.role === "dealer" && user.status === "active" && user.dealerId) return "/dealer";
  if (user.role === "user" && (user.status === "pending" || user.status === "rejected")) {
    return "/account/application";
  }
  if (user.role === "user" && user.status === "active") return "/";
  return "/account";
}

function decodeIdToken(idToken: string): { sub: string; email: string; name: string } | null {
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    if (!decoded.sub || !decoded.email) return null;
    return { sub: decoded.sub, email: decoded.email, name: decoded.name || decoded.email.split("@")[0] };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(new URL("/auth/login?error=google_oauth_red", process.env.NEXT_PUBLIC_APP_URL!));
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(new URL("/auth/login?error=google_config", process.env.NEXT_PUBLIC_APP_URL!));
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/auth/login?error=google_token", process.env.NEXT_PUBLIC_APP_URL!));
    }

    const tokens = await tokenRes.json();
    const idToken: string = tokens.id_token;
    if (!idToken) {
      return NextResponse.redirect(new URL("/auth/login?error=google_token", process.env.NEXT_PUBLIC_APP_URL!));
    }

    const profile = decodeIdToken(idToken);
    if (!profile) {
      return NextResponse.redirect(new URL("/auth/login?error=google_profile", process.env.NEXT_PUBLIC_APP_URL!));
    }

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: profile.email } });

      if (user) {
        if (user.password) {
          return NextResponse.redirect(
            new URL("/auth/login?error=google_email_exists", process.env.NEXT_PUBLIC_APP_URL!)
          );
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.sub },
        });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          role: "user",
          status: "pending",
        },
      });
    }

    const token = signToken(user);
    const redirectPath = getPostLoginPath(user);
    const response = NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL!));
    setAuthCookie(response, token);
    return response;

  } catch (e) {
    console.error("[google-oauth-callback]", e);
    return NextResponse.redirect(new URL("/auth/login?error=google_server", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
