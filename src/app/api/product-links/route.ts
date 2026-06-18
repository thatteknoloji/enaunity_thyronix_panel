import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { listAllLinks, listLinksForUser } from "@/lib/product-links/service";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productType = searchParams.get("productType") || undefined;
    const status = searchParams.get("status") || undefined;

    if (isAdminRole(user.role) && searchParams.get("all") === "true") {
      const links = await listAllLinks({ productType, status });
      return NextResponse.json({ success: true, data: links });
    }

    const links = await listLinksForUser(user.id);
    const filtered = links.filter((link) => {
      if (productType && link.productType !== productType) return false;
      if (status && link.status !== status) return false;
      return true;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
