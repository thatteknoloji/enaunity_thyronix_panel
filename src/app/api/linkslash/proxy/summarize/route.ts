import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { fetchSingleMeta } from "@/lib/linkslash/meta-fetch";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const url = new URL(req.url).searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "url parameter required" }, { status: 400 });
    }

    const result = await fetchSingleMeta(url, 3000);
    return NextResponse.json({
      url: result.url,
      title: result.title,
      description: result.description,
      text_content: result.text_content,
      error: result.error,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
