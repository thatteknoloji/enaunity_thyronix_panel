import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { checkLinks } from "@/lib/linkslash/meta-fetch";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = (await req.json()) as { urls?: string[] };
    const urls = Array.isArray(body.urls) ? body.urls.slice(0, 100) : [];
    const results = await checkLinks(urls);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
