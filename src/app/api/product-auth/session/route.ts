import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { PRODUCT_TYPES, type ProductType } from "@/lib/product-links/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productType = (searchParams.get("productType") || "THYRONIX") as ProductType;

  if (!PRODUCT_TYPES.includes(productType)) {
    return NextResponse.json({ success: false, error: "Geçersiz ürün tipi" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(productType === "THYRONIX" ? "thyronix_ok" : "hive_ok")?.value;
  const userCookie = cookieStore.get(`${productType.toLowerCase()}_user`)?.value;

  if (!sessionCookie || !userCookie) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  const externalUser = await prisma.productExternalUser.findUnique({
    where: { id: userCookie },
    include: {
      links: {
        where: { productType, status: "LINKED" },
        take: 1,
      },
    },
  });

  if (!externalUser || externalUser.status !== "ACTIVE" || externalUser.links.length === 0) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    data: {
      id: externalUser.id,
      email: externalUser.email,
      username: externalUser.username,
      name: externalUser.name,
      productType,
      linkId: externalUser.links[0].id,
    },
  });
}
