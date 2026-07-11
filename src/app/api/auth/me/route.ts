import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPendingReacceptanceForUser } from "@/lib/legal/reacceptance";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }
    const legalReaccept =
      user.role === "admin"
        ? { status: "ok", pending: [], blockedServices: { account: false, dealer: false, hive: false, thyronix: false } }
        : await getPendingReacceptanceForUser(user.id);
    return NextResponse.json({ success: true, data: { ...user, legalReaccept } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
