import { NextResponse } from "next/server";
import { getAvailablePlans } from "@/lib/modules/access";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleKey = searchParams.get("moduleKey") || "";
  if (!moduleKey) return NextResponse.json({ error: "moduleKey gerekli" }, { status: 400 });
  const plans = await getAvailablePlans(moduleKey);
  return NextResponse.json({ success: true, data: plans });
}
