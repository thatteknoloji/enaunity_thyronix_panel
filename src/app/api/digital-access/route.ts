import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDigitalLibraryEntriesForUser } from "@/lib/products/digital-access";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum gerekli" }, { status: 401 });
    }

    const items = await listDigitalLibraryEntriesForUser(user);
    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
