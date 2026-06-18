import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordProductLogin } from "@/lib/product-links/service";
import { PRODUCT_TYPES, type ProductType } from "@/lib/product-links/types";

export async function POST(req: Request) {
  try {
    const { email, password, productType } = await req.json();

    if (!email || !password || !productType) {
      return NextResponse.json({ success: false, error: "E-posta, şifre ve ürün tipi gerekli" }, { status: 400 });
    }

    if (!PRODUCT_TYPES.includes(productType as ProductType)) {
      return NextResponse.json({ success: false, error: "Geçersiz ürün tipi" }, { status: 400 });
    }

    const externalUser = await prisma.productExternalUser.findUnique({
      where: { productType_email: { productType, email } },
    });

    if (!externalUser || externalUser.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    const valid = await verifyPassword(password, externalUser.password);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    const link = await prisma.productAccountLink.findFirst({
      where: {
        externalUserId: externalUser.id,
        productType,
        status: "LINKED",
      },
    });

    if (!link) {
      return NextResponse.json({ success: false, error: "Hesap bağlantısı bulunamadı" }, { status: 403 });
    }

    await recordProductLogin(link.enaUserId, productType as ProductType);

    if (productType === "THYRONIX") {
      const { recordThyronixSession } = await import("@/lib/thyronix/integration");
      const enaUser = await prisma.user.findUnique({
        where: { id: link.enaUserId },
        select: { dealerId: true },
      });
      await recordThyronixSession({
        dealerId: enaUser?.dealerId || "",
        enaUserId: link.enaUserId,
        thyronixUserId: externalUser.id,
      });
    }

    if (productType === "HIVE") {
      const { recordHiveSession, getHiveWorkspaceForUser } = await import("@/lib/hive/integration");
      const enaUser = await prisma.user.findUnique({
        where: { id: link.enaUserId },
        select: { id: true, email: true, name: true, role: true, dealerId: true },
      });
      const workspace = enaUser ? await getHiveWorkspaceForUser(enaUser) : null;
      await recordHiveSession({
        dealerId: enaUser?.dealerId || "",
        enaUserId: link.enaUserId,
        hiveUserId: externalUser.id,
        workspaceId: workspace?.id,
      });
    }

    const cookieName = productType === "THYRONIX" ? "thyronix_ok" : "hive_ok";
    const redirectPath = productType === "THYRONIX" ? "/thyronix" : "/hive";

    const response = NextResponse.json({
      success: true,
      data: {
        id: externalUser.id,
        email: externalUser.email,
        username: externalUser.username,
        name: externalUser.name,
        productType,
        redirectTo: redirectPath,
      },
    });

    response.cookies.set(cookieName, "1", {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });

    response.cookies.set(`${productType.toLowerCase()}_user`, externalUser.id, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const productType = searchParams.get("productType") || "THYRONIX";
  const response = NextResponse.json({ success: true });
  const cookieName = productType === "THYRONIX" ? "thyronix_ok" : "hive_ok";
  response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
  response.cookies.set(`${productType.toLowerCase()}_user`, "", { path: "/", maxAge: 0 });
  return response;
}
