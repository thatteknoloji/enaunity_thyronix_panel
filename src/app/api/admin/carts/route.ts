import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { listObservedCarts } from "@/lib/cart/cart-observer-service";

export async function GET(req: Request) {
  try {
    await requireAdminPermission("orders_view");
    const { searchParams } = new URL(req.url);

    const data = await listObservedCarts({
      audience: (searchParams.get("audience") || "all") as "all" | "dealer" | "customer",
      status: (searchParams.get("status") || "all") as "all" | "live" | "idle" | "abandoned_candidate",
      search: searchParams.get("search") || "",
      productQuery: searchParams.get("productQuery") || "",
      minTotal: searchParams.get("minTotal") ? Number(searchParams.get("minTotal")) : undefined,
      maxTotal: searchParams.get("maxTotal") ? Number(searchParams.get("maxTotal")) : undefined,
      activityFrom: searchParams.get("activityFrom") || undefined,
      activityTo: searchParams.get("activityTo") || undefined,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20),
    });

    return NextResponse.json({ success: true, data: data.items, pagination: data.pagination });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Yetkisiz erişim" },
      { status: 401 },
    );
  }
}
