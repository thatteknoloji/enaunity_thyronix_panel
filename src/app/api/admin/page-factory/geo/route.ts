import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  deleteGeoEntity,
  getGeoStats,
  listGeoCountries,
  listGeoDistricts,
  listGeoNeighborhoods,
  listGeoProvinces,
  listGeoVillages,
  upsertGeoCountry,
  upsertGeoDistrict,
  upsertGeoNeighborhood,
  upsertGeoProvince,
  upsertGeoVillage,
} from "@/lib/data-universe/geo-service";

type GeoEntity = "countries" | "provinces" | "districts" | "neighborhoods" | "villages";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") || "provinces";

    if (entity === "stats") {
      const { getDataUniverseAdminStats } = await import("@/lib/data-universe/stats-service");
      const stats = await getDataUniverseAdminStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const geoEntity = entity as GeoEntity;
    const handlers: Record<GeoEntity, () => Promise<unknown>> = {
      countries: () => listGeoCountries(searchParams),
      provinces: () => listGeoProvinces(searchParams),
      districts: () => listGeoDistricts(searchParams),
      neighborhoods: () => listGeoNeighborhoods(searchParams),
      villages: () => listGeoVillages(searchParams),
    };

    const data = await handlers[geoEntity]();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GEO listesi alınamadı";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const entity = body.entity as GeoEntity;

    switch (entity) {
      case "countries":
        return NextResponse.json({ success: true, data: await upsertGeoCountry(body) });
      case "provinces":
        return NextResponse.json({ success: true, data: await upsertGeoProvince(body) });
      case "districts":
        return NextResponse.json({ success: true, data: await upsertGeoDistrict(body) });
      case "neighborhoods":
        return NextResponse.json({ success: true, data: await upsertGeoNeighborhood(body) });
      case "villages":
        return NextResponse.json({ success: true, data: await upsertGeoVillage(body) });
      default:
        return NextResponse.json({ success: false, error: "Geçersiz entity" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") as GeoEntity;
    const id = searchParams.get("id") || "";
    if (!entity || !id) {
      return NextResponse.json({ success: false, error: "entity ve id gerekli" }, { status: 400 });
    }
    await deleteGeoEntity(entity, id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Silinemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
