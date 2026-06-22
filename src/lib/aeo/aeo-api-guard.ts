import { NextResponse } from "next/server";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";
import { assertBlueprintAccess } from "@/lib/aeo/aeo-blueprint-service";

export async function requireAeoApiAccess(blueprintId?: string) {
  const guard = await requireProductUniverseApiAccess();
  if (guard.error) return { error: guard.error, user: null, blueprint: null };

  if (!blueprintId) {
    return { error: null, user: guard.user, blueprint: null };
  }

  try {
    const ctx = await assertBlueprintAccess(blueprintId, guard.user);
    return { error: null, user: guard.user, blueprint: ctx };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erişim reddedildi";
    const status = msg.includes("bulunamadı") ? 404 : 403;
    return {
      error: NextResponse.json({ success: false, error: msg }, { status }),
      user: null,
      blueprint: null,
    };
  }
}
