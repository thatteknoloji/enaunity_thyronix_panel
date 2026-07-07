import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import {
  createSourceRulesProfile,
  getGlobalRulesProfile,
  listRulesProfiles,
  resolveRulesDealerId,
} from "@/lib/thyronix/rules/profile-service";

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = await resolveRulesDealerId(user, searchParams.get("dealerId"));
    const scope = searchParams.get("scope");

    if (scope === "global") {
      const data = await getGlobalRulesProfile(dealerId);
      return NextResponse.json({ success: true, data });
    }

    const data = await listRulesProfiles(dealerId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const dealerId = await resolveRulesDealerId(user, body.dealerId);
    const name = String(body.name || "").trim() || "Kaynak Kuralları";
    const data = await createSourceRulesProfile(dealerId, name, body.copyFromGlobal !== false);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
