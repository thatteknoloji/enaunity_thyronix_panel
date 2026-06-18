import { NextResponse } from "next/server";

/** Platform admin bypass — sets hive_ok cookie after ENA admin login */
export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set("hive_ok", "1", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
