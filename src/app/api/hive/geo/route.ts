import { NextResponse } from "next/server";
import { requireHiveDealerOrAdmin, hiveErrorResponse } from "@/lib/hive/access";
import { getHiveGeoOverview, queryHiveGeo, queryHiveReference } from "@/lib/hive/geo-universe";

export async function GET(req: Request) {
  try {
    const user = await requireHiveDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "tree";

    if (mode === "overview") {
      const data = await getHiveGeoOverview(user);
      return NextResponse.json({ success: true, data });
    }

    const ref = searchParams.get("ref") as "industries" | "intents" | "patterns" | null;
    if (ref) {
      const data = await queryHiveReference(user, ref, searchParams);
      return NextResponse.json({ success: true, data: { ref, ...data } });
    }

    const data = await queryHiveGeo(user, searchParams);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return hiveErrorResponse(e);
  }
}
