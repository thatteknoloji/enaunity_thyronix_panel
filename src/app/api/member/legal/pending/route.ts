import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPendingReacceptanceForUser } from "@/lib/legal/reacceptance";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
  if (user.role === "admin") {
    return NextResponse.json({
      success: true,
      data: { status: "ok", pending: [], blockedServices: { account: false, dealer: false, hive: false, thyronix: false } },
    });
  }

  const data = await getPendingReacceptanceForUser(user.id);
  return NextResponse.json({ success: true, data });
}
