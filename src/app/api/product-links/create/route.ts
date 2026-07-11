import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createProductAccountLink, getProductLoginRedirect } from "@/lib/product-links/service";
import { provisionThyronixAccount } from "@/lib/thyronix/integration";
import { provisionHiveAccount } from "@/lib/hive/integration";
import { PRODUCT_TYPES, type ProductType } from "@/lib/product-links/types";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }

    const body = await req.json();
    const productType = body.productType as ProductType;
    if (!PRODUCT_TYPES.includes(productType)) {
      return NextResponse.json({ success: false, error: "Geçersiz ürün tipi" }, { status: 400 });
    }

    if (productType === "THYRONIX") {
      const result = await provisionThyronixAccount(user);
      return NextResponse.json({
        success: true,
        data: {
          link: result.link,
          tempPassword: result.tempPassword,
          redirectTo: result.redirectTo,
          sessionRecorded: true,
        },
      });
    }

    if (productType === "HIVE") {
      const result = await provisionHiveAccount(user);
      return NextResponse.json({
        success: true,
        data: {
          link: result.link,
          tempPassword: result.tempPassword,
          redirectTo: result.redirectTo,
          workspace: result.workspace,
          sessionRecorded: true,
        },
      });
    }

    const result = await createProductAccountLink(user, productType, {
      username: body.username,
      password: body.password,
      createdFrom: "api",
    });

    return NextResponse.json({
      success: true,
      data: {
        link: result.link,
        tempPassword: result.tempPassword,
        redirectTo: getProductLoginRedirect(productType, result.link.externalEmail),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    const status = message.includes("lisans") ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
