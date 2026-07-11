import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_APPEARANCE, isValidAccent, isValidTheme } from "@/lib/theme/tokens";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Oturum gerekli" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const appearance = await prisma.userAppearance.findUnique({ where: { userId: user.id } });
  if (!appearance) {
    return NextResponse.json(
      { success: true, data: DEFAULT_APPEARANCE },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        theme: isValidTheme(appearance.theme) ? appearance.theme : DEFAULT_APPEARANCE.theme,
        accent: isValidAccent(appearance.accent) ? appearance.accent : DEFAULT_APPEARANCE.accent,
        compactMode: appearance.compactMode,
        reducedMotion: appearance.reducedMotion,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum gerekli" }, { status: 401 });
  }
  if (user.id.startsWith("api:") || (user as { isSubUser?: boolean }).isSubUser) {
    return NextResponse.json(
      { success: false, error: "Görünüm tercihi yalnızca ana hesap için kaydedilebilir" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const body = await req.json();
  const current = await prisma.userAppearance.findUnique({ where: { userId: user.id } });

  const theme = body.theme !== undefined
    ? (isValidTheme(body.theme) ? body.theme : current?.theme || DEFAULT_APPEARANCE.theme)
    : current?.theme || DEFAULT_APPEARANCE.theme;

  const accent = body.accent !== undefined
    ? (isValidAccent(body.accent) ? body.accent : current?.accent || DEFAULT_APPEARANCE.accent)
    : current?.accent || DEFAULT_APPEARANCE.accent;

  const compactMode = body.compactMode !== undefined ? !!body.compactMode : current?.compactMode ?? false;
  const reducedMotion = body.reducedMotion !== undefined ? !!body.reducedMotion : current?.reducedMotion ?? false;

  const saved = await prisma.userAppearance.upsert({
    where: { userId: user.id },
    create: { userId: user.id, theme, accent, compactMode, reducedMotion },
    update: { theme, accent, compactMode, reducedMotion },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        theme: saved.theme,
        accent: saved.accent,
        compactMode: saved.compactMode,
        reducedMotion: saved.reducedMotion,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
