import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getSession } from "@/lib/auth";

const ZIP_PATH = join(process.cwd(), "private/product-library/ena-marketplace-connector.zip");

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isDealer = user.role === "dealer";

    if (!isAdmin && !isDealer) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const buffer = readFileSync(ZIP_PATH);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=\"ena-marketplace-connector.zip\"",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
