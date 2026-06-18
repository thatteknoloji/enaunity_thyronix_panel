import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const exclusions = await prisma.thyronixExclusion.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: exclusions });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const exclusion = await prisma.thyronixExclusion.create({ data: body });
    return NextResponse.json({ success: true, data: exclusion }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
