import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", proxy: "LinkSlash Meta Tag Proxy" });
}
